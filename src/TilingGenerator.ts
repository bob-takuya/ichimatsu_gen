import {vec2} from 'linearly'

/**
 * 菱形タイリングパターンの生成と管理
 */

export interface TilingPattern {
	offsets: number[] // 12個のオフセット値
	id: string
	name?: string
	/** SVGパス文字列 */
	path: string
	/** 持続時間（フレーム数） */
	duration: number
	/** メタデータ */
	meta: Record<string, number | vec2 | string | boolean>
}

export interface RhombusInfo {
	/** 菱形の中心座標 */
	center: vec2
	/** 相対的な頂点座標 */
	vertices: vec2[]
	/** 菱形のタイプ（角度による分類） */
	type: 'thin' | 'thick' | 'other'
	/** 色 */
	color: string
}

export interface TilingData {
	rhombuses: RhombusInfo[]
	bounds: {min: vec2; max: vec2}
	lines: Array<{a: number; b: number; c: number; angle_deg: number}>
}

/**
 * 12個のオフセット値から菱形タイリングを生成
 */
export function generateRhombusTiling(offsets: number[], sideLength: number = 1.0): TilingData {
	if (offsets.length !== 12) {
		throw new Error('offsets must contain exactly 12 values')
	}

	// ゾーンストレートラインの角度定義
	const anglesDeg = [15, 15, 45, 45, 75, 75, 105, 105, 135, 135, 165, 165]
	const anglesRad = anglesDeg.map(deg => (deg * Math.PI) / 180)

	// 直線の定義
	const lines = anglesDeg.map((angleDeg, i) => {
		const theta = anglesRad[i]
		return {
			a: -Math.sin(theta),
			b: Math.cos(theta),
			c: offsets[i],
			angle_deg: angleDeg,
			angle_rad: theta,
			id: i,
		}
	})

	// 交点計算と菱形データ生成
	const intersections = new Map<string, vec2>()
	const rhombusDataMap = new Map<string, any>()

	for (let i = 0; i < 12; i++) {
		for (let j = i + 1; j < 12; j++) {
			const l1 = lines[i]
			const l2 = lines[j]
			
			if (l1.angle_deg === l2.angle_deg) continue

			// 連立方程式を解いて交点を求める
			const det = l1.a * l2.b - l2.a * l1.b
			if (Math.abs(det) < 1e-10) continue

			const x = (l2.b * l1.c - l1.b * l2.c) / det
			const y = (l1.a * l2.c - l2.a * l1.c) / det
			const center: vec2 = [x, y]

			const key = `${Math.min(i, j)}-${Math.max(i, j)}`
			intersections.set(key, center)

			// 菱形の頂点計算
			const t1 = l1.angle_rad
			const t2 = l2.angle_rad
			const s1: vec2 = [
				sideLength * -Math.sin(t1),
				sideLength * Math.cos(t1),
			]
			const s2: vec2 = [
				sideLength * -Math.sin(t2),
				sideLength * Math.cos(t2),
			]

			const relativeVertices: vec2[] = [
				[(s1[0] + s2[0]) / 2, (s1[1] + s2[1]) / 2],
				[(s1[0] - s2[0]) / 2, (s1[1] - s2[1]) / 2],
				[(-s1[0] - s2[0]) / 2, (-s1[1] - s2[1]) / 2],
				[(-s1[0] + s2[0]) / 2, (-s1[1] + s2[1]) / 2],
			]

			rhombusDataMap.set(key, {
				center: [...center] as vec2,
				initialCenter: [...center] as vec2,
				relativeVertices,
				sideVectors: {s1, s2, t1, t2},
				key: [i, j],
				placed: false,
				adjacent: [],
			})
		}
	}

	// 隣接関係の構築
	for (let lineIdx = 0; lineIdx < 12; lineIdx++) {
		const keysOnLine = Array.from(rhombusDataMap.keys()).filter(key => {
			const [i, j] = key.split('-').map(Number)
			return i === lineIdx || j === lineIdx
		})

		const dirVec: vec2 = [
			Math.cos(lines[lineIdx].angle_rad),
			Math.sin(lines[lineIdx].angle_rad),
		]

		keysOnLine.sort((a, b) => {
			const centerA = intersections.get(a)!
			const centerB = intersections.get(b)!
			const dotA = centerA[0] * dirVec[0] + centerA[1] * dirVec[1]
			const dotB = centerB[0] * dirVec[0] + centerB[1] * dirVec[1]
			return dotA - dotB
		})

		for (let k = 0; k < keysOnLine.length - 1; k++) {
			const key1 = keysOnLine[k]
			const key2 = keysOnLine[k + 1]
			rhombusDataMap.get(key1)!.adjacent.push(key2)
			rhombusDataMap.get(key2)!.adjacent.push(key1)
		}
	}

	// 菱形の連結処理
	const queue: string[] = []
	if (rhombusDataMap.size > 0) {
		// 原点に最も近い菱形から開始
		const startKey = Array.from(rhombusDataMap.keys()).reduce((closest, key) => {
			const centerA = rhombusDataMap.get(closest)!.center
			const centerB = rhombusDataMap.get(key)!.center
			const distA = Math.sqrt(centerA[0] ** 2 + centerA[1] ** 2)
			const distB = Math.sqrt(centerB[0] ** 2 + centerB[1] ** 2)
			return distA <= distB ? closest : key
		})

		rhombusDataMap.get(startKey)!.placed = true
		queue.push(startKey)

		while (queue.length > 0) {
			const currKey = queue.shift()!
			const rCurr = rhombusDataMap.get(currKey)!

			for (const adjKey of rCurr.adjacent) {
				const rAdj = rhombusDataMap.get(adjKey)!
				if (rAdj.placed) continue

				// 共通する直線を見つける
				const currIndices = rCurr.key
				const adjIndices = rAdj.key
				const commonLineIdx = currIndices.find((idx: number) => adjIndices.includes(idx))

				if (commonLineIdx !== undefined) {
					// 接続辺の計算と移動処理
					const currOtherIdx = currIndices.find((idx: number) => idx !== commonLineIdx)
					const adjOtherIdx = adjIndices.find((idx: number) => idx !== commonLineIdx)

					if (currOtherIdx !== undefined && adjOtherIdx !== undefined) {
						const tCurrOther = lines[currOtherIdx].angle_rad
						const tAdjOther = lines[adjOtherIdx].angle_rad

						let sCurrEdge: vec2 = [
							sideLength * -Math.sin(tCurrOther),
							sideLength * Math.cos(tCurrOther),
						]
						let sAdjEdge: vec2 = [
							sideLength * -Math.sin(tAdjOther),
							sideLength * Math.cos(tAdjOther),
						]

						// 接続方向の判定
						const vecCurrToAdj: vec2 = [
							rAdj.initialCenter[0] - rCurr.initialCenter[0],
							rAdj.initialCenter[1] - rCurr.initialCenter[1],
						]

						if (sCurrEdge[0] * vecCurrToAdj[0] + sCurrEdge[1] * vecCurrToAdj[1] < 0) {
							sCurrEdge = [-sCurrEdge[0], -sCurrEdge[1]]
						}
						if (sAdjEdge[0] * vecCurrToAdj[0] + sAdjEdge[1] * vecCurrToAdj[1] > 0) {
							sAdjEdge = [-sAdjEdge[0], -sAdjEdge[1]]
						}

						// 移動ベクトル計算
						const currEdgeMidpoint: vec2 = [
							rCurr.center[0] + sCurrEdge[0] / 2,
							rCurr.center[1] + sCurrEdge[1] / 2,
						]
						const adjEdgeMidpointInitial: vec2 = [
							rAdj.initialCenter[0] + sAdjEdge[0] / 2,
							rAdj.initialCenter[1] + sAdjEdge[1] / 2,
						]

						const translation: vec2 = [
							currEdgeMidpoint[0] - adjEdgeMidpointInitial[0],
							currEdgeMidpoint[1] - adjEdgeMidpointInitial[1],
						]

						// 菱形を移動
						rAdj.center = [
							rAdj.initialCenter[0] + translation[0],
							rAdj.initialCenter[1] + translation[1],
						]
						rAdj.placed = true
						queue.push(adjKey)
					}
				}
			}
		}
	}

	// 最終的な菱形情報を生成
	const rhombuses: RhombusInfo[] = []
	let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

	for (const [key, rInfo] of rhombusDataMap) {
		const [l1Idx, l2Idx] = key.split('-').map(Number)
		const angleDiff = Math.abs(lines[l1Idx].angle_deg - lines[l2Idx].angle_deg)
		const normalizedAngleDiff = Math.min(angleDiff, 180 - angleDiff)

		let type: 'thin' | 'thick' | 'other'
		let color: string

		if (Math.abs(normalizedAngleDiff - 30) < 1) {
			type = 'thin'
			color = '#4682B4'
		} else if (Math.abs(normalizedAngleDiff - 60) < 1) {
			type = 'thick'
			color = '#B0C4DE'
		} else {
			type = 'other'
			color = '#708090'
		}

		// 絶対座標での頂点計算
		const vertices: vec2[] = rInfo.relativeVertices.map((relVert: vec2) => [
			rInfo.center[0] + relVert[0],
			rInfo.center[1] + relVert[1],
		])

		// 角度順にソート
		const center = rInfo.center
		const sortedVertices = vertices.sort((a, b) => {
			const angleA = Math.atan2(a[1] - center[1], a[0] - center[0])
			const angleB = Math.atan2(b[1] - center[1], b[0] - center[0])
			return angleA - angleB
		})

		rhombuses.push({
			center: rInfo.center,
			vertices: sortedVertices,
			type,
			color,
		})

		// 境界の更新
		for (const vertex of sortedVertices) {
			minX = Math.min(minX, vertex[0])
			maxX = Math.max(maxX, vertex[0])
			minY = Math.min(minY, vertex[1])
			maxY = Math.max(maxY, vertex[1])
		}
	}

	return {
		rhombuses,
		bounds: {
			min: [minX, minY],
			max: [maxX, maxY],
		},
		lines: lines.map(line => ({
			a: line.a,
			b: line.b,
			c: line.c,
			angle_deg: line.angle_deg,
		})),
	}
}

/**
 * TilingDataからSVGパス文字列を生成（従来版）
 */
export function tilingToSVGPath(tiling: TilingData, width?: number, height?: number): string {
	const paths: string[] = []

	// デフォルトでは生成されたタイリングの境界を使用
	const bounds = tiling.bounds
	const tileWidth = bounds.max[0] - bounds.min[0]
	const tileHeight = bounds.max[1] - bounds.min[1]
	
	// サイズが指定されている場合はスケールを計算
	let scale = 1
	let offsetX = 0
	let offsetY = 0
	
	if (width && height) {
		const scaleX = width / tileWidth
		const scaleY = height / tileHeight
		scale = Math.min(scaleX, scaleY) * 0.8 // 少しマージンを残す
		
		// 中央配置のためのオフセット
		offsetX = (width - tileWidth * scale) / 2 - bounds.min[0] * scale
		offsetY = (height - tileHeight * scale) / 2 - bounds.min[1] * scale
	}

	for (const rhombus of tiling.rhombuses) {
		const vertices = rhombus.vertices
		if (vertices.length > 0) {
			const scaledVertices = vertices.map(([x, y]) => [
				x * scale + offsetX,
				y * scale + offsetY
			])
			
			let path = `M ${scaledVertices[0][0]} ${scaledVertices[0][1]}`
			for (let i = 1; i < scaledVertices.length; i++) {
				path += ` L ${scaledVertices[i][0]} ${scaledVertices[i][1]}`
			}
			path += ' Z'
			paths.push(path)
		}
	}

	return paths.join(' ')
}

/**
 * TilingDataから描画モード対応のパスデータを生成
 */
export function tilingToRenderPaths(
	tiling: TilingData, 
	width?: number, 
	height?: number,
	options?: {
		showEdges?: boolean
		showFills?: boolean
	}
): { edgePaths: string[], fillPaths: string[] } {
	const {
		showEdges = true,
		showFills = false
	} = options || {}

	const edgePaths: string[] = []
	const fillPaths: string[] = []

	// デフォルトでは生成されたタイリングの境界を使用
	const bounds = tiling.bounds
	const tileWidth = bounds.max[0] - bounds.min[0]
	const tileHeight = bounds.max[1] - bounds.min[1]
	
	// サイズが指定されている場合はスケールを計算
	let scale = 1
	let offsetX = 0
	let offsetY = 0
	
	if (width && height) {
		const scaleX = width / tileWidth
		const scaleY = height / tileHeight
		scale = Math.min(scaleX, scaleY) * 0.8 // 少しマージンを残す
		
		// 中央配置のためのオフセット
		offsetX = (width - tileWidth * scale) / 2 - bounds.min[0] * scale
		offsetY = (height - tileHeight * scale) / 2 - bounds.min[1] * scale
	}

	for (const rhombus of tiling.rhombuses) {
		const vertices = rhombus.vertices
		if (vertices.length > 0) {
			const scaledVertices = vertices.map(([x, y]) => [
				x * scale + offsetX,
				y * scale + offsetY
			])
			
			// ひし形のエッジパス
			if (showEdges) {
				let rhombusPath = `M ${scaledVertices[0][0]} ${scaledVertices[0][1]}`
				for (let i = 1; i < scaledVertices.length; i++) {
					rhombusPath += ` L ${scaledVertices[i][0]} ${scaledVertices[i][1]}`
				}
				rhombusPath += ' Z'
				edgePaths.push(rhombusPath)
			}
			
			// 塗りつぶし描画（ひし形の中点を結んだ長方形）
			if (showFills) {
				// ひし形の4つの辺の中点を計算
				const midpoints: vec2[] = []
				for (let i = 0; i < scaledVertices.length; i++) {
					const current = scaledVertices[i]
					const next = scaledVertices[(i + 1) % scaledVertices.length]
					midpoints.push([
						(current[0] + next[0]) / 2,
						(current[1] + next[1]) / 2
					])
				}
				
				// 中点を結んだ長方形のパス
				let rectPath = `M ${midpoints[0][0]} ${midpoints[0][1]}`
				for (let i = 1; i < midpoints.length; i++) {
					rectPath += ` L ${midpoints[i][0]} ${midpoints[i][1]}`
				}
				rectPath += ' Z'
				fillPaths.push(rectPath)
			}
		}
	}

	return { edgePaths, fillPaths }
}

/**
 * オフセット配列からTilingPatternを生成
 */
export function createTilingPattern(
	offsets: number[],
	options: {
		id?: string
		name?: string
		duration?: number
		sideLength?: number
	} = {}
): TilingPattern {
	const {
		id = `tiling_${Date.now()}`,
		name,
		duration = 1,
		sideLength = 1.0,
	} = options

	const tiling = generateRhombusTiling(offsets, sideLength)
	const path = tilingToSVGPath(tiling)

	return {
		offsets: [...offsets],
		id,
		name,
		path,
		duration,
		meta: {
			rhombusCount: tiling.rhombuses.length,
			boundsMin: tiling.bounds.min,
			boundsMax: tiling.bounds.max,
		},
	}
}
