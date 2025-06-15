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
	/** ひし形隣接関係の識別用ハッシュ値 */
	adjacencyHash?: string
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

	// 隣接関係のハッシュを計算（パターン変化検知用）
	const adjacencyData = Array.from(rhombusDataMap.entries()).map(([key, data]) => ({
		key,
		center: data.center,
		adjacent: data.adjacent.sort() // ソートして一意性を保つ
	}))
	const adjacencyHash = generateAdjacencyHash(adjacencyData)

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
		adjacencyHash,
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

/**
 * 隣接関係データからハッシュ値を生成
 */
function generateAdjacencyHash(adjacencyData: Array<{key: string; center: vec2; adjacent: string[]}>): string {
	const dataString = adjacencyData
		.sort((a, b) => a.key.localeCompare(b.key))
		.map(item => `${item.key}:${item.center[0].toFixed(6)},${item.center[1].toFixed(6)}:${item.adjacent.join(',')}`)
		.join('|')
	
	// 簡易ハッシュ関数
	let hash = 0
	for (let i = 0; i < dataString.length; i++) {
		const char = dataString.charCodeAt(i)
		hash = ((hash << 5) - hash) + char
		hash = hash & hash // 32bit整数に変換
	}
	return hash.toString(36)
}

/**
 * 2つのTilingDataの隣接関係が異なるかを判定
 */
export function hasAdjacencyChanged(tiling1: TilingData, tiling2: TilingData): boolean {
	return tiling1.adjacencyHash !== tiling2.adjacencyHash
}

/**
 * より詳細なパターン変化の検知
 */
function hasDetailedPatternChange(tiling1: TilingData, tiling2: TilingData): boolean {
	// 1. ひし形の数の変化
	if (tiling1.rhombuses.length !== tiling2.rhombuses.length) {
		return true
	}
	
	// 2. 隣接関係の変化
	if (hasAdjacencyChanged(tiling1, tiling2)) {
		return true
	}
	
	// 3. ひし形のタイプ分布の変化
	const getTypeDistribution = (tiling: TilingData) => {
		const distribution = { thin: 0, thick: 0, other: 0 }
		tiling.rhombuses.forEach(r => distribution[r.type]++)
		return distribution
	}
	
	const dist1 = getTypeDistribution(tiling1)
	const dist2 = getTypeDistribution(tiling2)
	
	if (dist1.thin !== dist2.thin || dist1.thick !== dist2.thick || dist1.other !== dist2.other) {
		return true
	}
	
	// 4. ひし形の重心位置の変化
	const getCenterOfMass = (tiling: TilingData) => {
		if (tiling.rhombuses.length === 0) return [0, 0]
		const sum = tiling.rhombuses.reduce((acc, r) => [acc[0] + r.center[0], acc[1] + r.center[1]], [0, 0])
		return [sum[0] / tiling.rhombuses.length, sum[1] / tiling.rhombuses.length]
	}
	
	const center1 = getCenterOfMass(tiling1)
	const center2 = getCenterOfMass(tiling2)
	const centerDistance = Math.sqrt((center1[0] - center2[0]) ** 2 + (center1[1] - center2[1]) ** 2)
	
	if (centerDistance > 0.1) {
		return true
	}
	
	return false
}

/**
 * より効率的なパターン変化検知（計算量を削減）
 */
function hasSignificantChange(tiling1: TilingData, tiling2: TilingData): boolean {
	// 最も軽量な検査から順に実行
	
	// 1. ひし形の数の変化（O(1)）
	if (tiling1.rhombuses.length !== tiling2.rhombuses.length) {
		return true
	}
	
	// 2. 隣接関係の変化（O(1)）
	if (tiling1.adjacencyHash !== tiling2.adjacencyHash) {
		return true
	}
	
	// 3. 境界ボックスの大きさの変化（O(1)）
	const size1 = (tiling1.bounds.max[0] - tiling1.bounds.min[0]) * (tiling1.bounds.max[1] - tiling1.bounds.min[1])
	const size2 = (tiling2.bounds.max[0] - tiling2.bounds.min[0]) * (tiling2.bounds.max[1] - tiling2.bounds.min[1])
	
	if (Math.abs(size1 - size2) > 0.01) {
		return true
	}
	
	return false
}

/**
 * 最適化されたパターン変化検知
 */
export function findOptimalPatternChange(
	baseOffsets: number[], 
	lineIndex: number, 
	direction: number, 
	options: {
		stepSize?: number
		maxSteps?: number
		minChange?: number
	} = {}
): { offsets: number[]; changed: boolean; steps: number } {
	const { stepSize = 0.1, maxSteps = 100, minChange = 0.01 } = options
	
	let baseTiling: TilingData
	try {
		baseTiling = generateRhombusTiling(baseOffsets)
	} catch (e) {
		// ベースパターンの生成に失敗した場合、小さな変化を返す
		const testOffsets = [...baseOffsets]
		testOffsets[lineIndex] = baseOffsets[lineIndex] + (direction * stepSize)
		return { offsets: testOffsets, changed: true, steps: 1 }
	}
	
	let currentStep = 0
	let lastValidOffsets = [...baseOffsets]
	let foundChange = false
	
	// 二分探索的アプローチで効率的に変化点を見つける
	let lowStep = 0
	let highStep = maxSteps
	
	while (lowStep < highStep && currentStep < maxSteps) {
		currentStep++
		const midStep = Math.floor((lowStep + highStep) / 2)
		
		const testOffsets = [...baseOffsets]
		const newValue = baseOffsets[lineIndex] + (direction * stepSize * midStep)
		testOffsets[lineIndex] = newValue
		
		// 範囲チェック
		if (Math.abs(newValue) > 10) {
			highStep = midStep - 1
			continue
		}
		
		try {
			const testTiling = generateRhombusTiling(testOffsets)
			
			if (hasSignificantChange(baseTiling, testTiling)) {
				foundChange = true
				highStep = midStep
				lastValidOffsets = [...testOffsets]
			} else {
				lowStep = midStep + 1
			}
		} catch (e) {
			// エラーが発生した場合も変化とみなす
			foundChange = true
			highStep = midStep
			lastValidOffsets = [...testOffsets]
		}
		
		// 早期終了条件
		if (highStep - lowStep <= 1) {
			break
		}
	}
	
	// 最小変化量を確保
	if (!foundChange) {
		const minChangeStep = Math.max(1, Math.ceil(minChange / stepSize))
		const testOffsets = [...baseOffsets]
		const newValue = baseOffsets[lineIndex] + (direction * stepSize * minChangeStep)
		testOffsets[lineIndex] = Math.max(-10, Math.min(10, newValue))
		return { offsets: testOffsets, changed: false, steps: minChangeStep }
	}
	
	return { offsets: lastValidOffsets, changed: foundChange, steps: currentStep }
}

/**
 * 指定されたオフセットで最初にパターンが変化する点を見つける
 */
export function findFirstPatternChange(
	baseOffsets: number[], 
	lineIndex: number, 
	direction: number, 
	stepSize: number = 0.2, 
	maxSteps: number = 50
): { offsets: number[]; changed: boolean } {
	let baseTiling;
	try {
		baseTiling = generateRhombusTiling(baseOffsets)
	} catch (e) {
		// ベースパターンの生成に失敗した場合、変化なしとして扱う
		const testOffsets = [...baseOffsets]
		testOffsets[lineIndex] = baseOffsets[lineIndex] + (direction * stepSize)
		return { offsets: testOffsets, changed: false }
	}
	
	for (let step = 1; step <= maxSteps; step++) {
		const testOffsets = [...baseOffsets]
		const newValue = baseOffsets[lineIndex] + (direction * stepSize * step)
		testOffsets[lineIndex] = newValue
		
		// 範囲チェック
		if (Math.abs(newValue) > 10) {
			// 範囲外の場合、最後の有効な値で変化なしとして返す
			testOffsets[lineIndex] = direction > 0 ? 10 : -10
			return { offsets: testOffsets, changed: false }
		}
		
		try {
			const testTiling = generateRhombusTiling(testOffsets)
			
			// 詳細な変化検知を使用
			if (hasDetailedPatternChange(baseTiling, testTiling)) {
				return { offsets: testOffsets, changed: true }
			}
		} catch (e) {
			// エラーが発生した場合、前のステップで止める（変化なし）
			const safeOffsets = [...baseOffsets]
			const safeValue = baseOffsets[lineIndex] + (direction * stepSize * (step - 1))
			safeOffsets[lineIndex] = Math.max(-10, Math.min(10, safeValue))
			return { offsets: safeOffsets, changed: false }
		}
	}
	
	// 変化が見つからない場合は、変化なしとして現在の値を少し変更した値を返す
	const testOffsets = [...baseOffsets]
	const smallChange = direction * stepSize * 2 // 小さな変化
	testOffsets[lineIndex] = Math.max(-10, Math.min(10, baseOffsets[lineIndex] + smallChange))
	return { offsets: testOffsets, changed: false }
}

/**
 * 高品質な方向別バリエーション生成
 */
export function generateDirectionalVariations(
	baseOffsets: number[], 
	stepSize: number = 0.1, 
	maxSteps: number = 100
): TilingPattern[] {
	const variations: TilingPattern[] = []
	
	console.log('🚀 Starting optimized variation generation...')
	console.time('Variation Generation')
	
	const basePattern = createTilingPattern(baseOffsets, {
		id: 'base',
		name: 'Base Pattern',
	})
	
	let successfulVariations = 0
	let totalChanges = 0
	
	for (let lineIndex = 0; lineIndex < 12; lineIndex++) {
		// 各線について両方向に最適化された変化検知を実行
		for (const direction of [1, -1] as const) {
			// より単純で確実なfindFirstPatternChangeを使用
			const result = findFirstPatternChange(baseOffsets, lineIndex, direction, stepSize, maxSteps)
			
			const changeAmount = result.offsets[lineIndex] - baseOffsets[lineIndex]
			const directionSymbol = direction > 0 ? '+' : ''
			
			const pattern = createTilingPattern(result.offsets, {
				id: `opt_${lineIndex}_${direction > 0 ? 'pos' : 'neg'}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
				name: `L${lineIndex + 1}${directionSymbol}${changeAmount.toFixed(2)}`,
				duration: 1,
			})
			
			// メタデータに追加情報を含める
			pattern.meta = {
				...pattern.meta,
				lineIndex,
				direction,
				changeAmount,
				foundChange: result.changed, // ここで正しくchangedフラグを設定
				baseRhombusCount: basePattern.meta.rhombusCount,
				rhombusCountDiff: (pattern.meta.rhombusCount as number) - (basePattern.meta.rhombusCount as number)
			}
			
			variations.push(pattern)
			
			if (result.changed) {
				successfulVariations++
				totalChanges += Math.abs(changeAmount)
			}
			
			console.log(`✨ L${lineIndex + 1}${directionSymbol}: Δ${changeAmount.toFixed(3)} (${result.changed ? 'CHANGED' : 'no change'})`)
		}
	}
	
	console.timeEnd('Variation Generation')
	console.log(`📊 Summary: ${successfulVariations}/${variations.length} successful variations, avg change: ${successfulVariations > 0 ? (totalChanges / successfulVariations).toFixed(3) : 'N/A'}`)
	
	// 品質フィルタリング：変化があるもののみを返す
	const filteredVariations = variations.filter(v => v.meta.foundChange)
	
	console.log(`🎯 Final result: ${filteredVariations.length} variations with actual changes`)
	
	return filteredVariations
}
