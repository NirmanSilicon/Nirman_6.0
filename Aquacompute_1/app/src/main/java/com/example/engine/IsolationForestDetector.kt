package com.example.engine

import com.example.model.AnomalySeverity
import com.example.model.SensorReading
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.pow
import kotlin.random.Random

/**
 * Pure Kotlin Isolation Forest implementation for multi-feature telemetry anomaly scoring.
 * Uses lazy tree initialization, zero-allocation feature evaluation, precomputed c(n) table,
 * and an epsilon cache to avoid redundant tree traversals when sensor values are unchanged.
 */
class IsolationForestDetector(
    private val numTrees: Int = 24,
    private val sampleSize: Int = 64,
    private val seed: Int = 42
) {
    private sealed interface ITreeNode {
        class Internal(
            val featureIndex: Int,
            val splitValue: Double,
            val left: ITreeNode,
            val right: ITreeNode
        ) : ITreeNode

        class Leaf(val size: Int) : ITreeNode
    }

    data class IsolationResult(
        val score: Double,
        val severity: AnomalySeverity,
        val topContributingSensor: String,
        val featureDeviationSummary: String
    )

    private val maxDepth = kotlin.math.ceil(ln(sampleSize.toDouble()) / ln(2.0)).toInt()

    private val featureNames = arrayOf(
        "Water Flow (L/min)",
        "Loop Pressure (bar)",
        "Coolant Temp (°C)",
        "IT Workload (%)",
        "Ambient Temp (°C)"
    )
    private val nominalMeans = doubleArrayOf(69.4, 3.20, 23.5, 68.0, 26.5)
    private val nominalStds = doubleArrayOf(6.5, 0.28, 2.2, 12.0, 3.5)

    // Precomputed c(n) lookup for sizes 0..sampleSize to avoid repeated ln() during scoring
    private val cTable = DoubleArray(sampleSize + 1) { n -> computeAveragePathLengthC(n) }
    private val cnSampleSize = cTable[sampleSize]

    // Lazily constructed so object creation does not block the caller thread
    private val trees: Array<ITreeNode> by lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
        val rng = Random(seed)
        val datasetSize = 256
        val nominalDataset = Array(datasetSize) {
            doubleArrayOf(
                nominalMeans[0] + nextGaussian(rng) * nominalStds[0],
                nominalMeans[1] + nextGaussian(rng) * nominalStds[1],
                nominalMeans[2] + nextGaussian(rng) * nominalStds[2],
                (nominalMeans[3] + nextGaussian(rng) * nominalStds[3]).coerceIn(20.0, 95.0),
                nominalMeans[4] + nextGaussian(rng) * nominalStds[4]
            )
        }
        val indices = IntArray(datasetSize) { it }
        Array(numTrees) {
            // Partial Fisher-Yates shuffle for O(sampleSize) sampling without list copies
            for (i in 0 until sampleSize) {
                val j = i + rng.nextInt(datasetSize - i)
                val tmp = indices[i]
                indices[i] = indices[j]
                indices[j] = tmp
            }
            val sample = ArrayList<DoubleArray>(sampleSize)
            for (i in 0 until sampleSize) {
                sample.add(nominalDataset[indices[i]])
            }
            buildTree(sample, depth = 0, rng = rng)
        }
    }

    @Volatile
    private var lastKey: Long = Long.MIN_VALUE

    @Volatile
    private var lastResult: IsolationResult? = null

    fun warmUp() {
        trees.size
    }

    fun evaluate(reading: SensorReading): IsolationResult {
        // Quantized cache key (~0.05 L/m, 0.01 bar, 0.05°C, 0.2% load, 0.05°C ambient)
        val qFlow = (reading.flowRateLpm * 20.0).toLong()
        val qPres = (reading.pressureBar * 100.0).toLong()
        val qTemp = (reading.temperatureC * 20.0).toLong()
        val qLoad = (reading.workloadPct * 5.0).toLong()
        val qAmb = (reading.ambientTempC * 20.0).toLong()
        val key = (((((qFlow * 31 + qPres) * 31 + qTemp) * 31 + qLoad) * 31) + qAmb)

        val cached = lastResult
        if (cached != null && key == lastKey) {
            return cached
        }

        val forest = trees
        var totalPath = 0.0
        for (i in forest.indices) {
            totalPath += pathLength(
                f0 = reading.flowRateLpm,
                f1 = reading.pressureBar,
                f2 = reading.temperatureC,
                f3 = reading.workloadPct,
                f4 = reading.ambientTempC,
                node = forest[i]
            )
        }
        val avgPath = totalPath / forest.size.toDouble()
        val score = 2.0.pow(-avgPath / cnSampleSize).coerceIn(0.0, 1.0)

        // Zero-allocation feature attribution
        var maxIdx = 0
        var maxZ = -1.0
        for (idx in 0..4) {
            val featureVal = when (idx) {
                0 -> reading.flowRateLpm
                1 -> reading.pressureBar
                2 -> reading.temperatureC
                3 -> reading.workloadPct
                else -> reading.ambientTempC
            }
            val z = abs(featureVal - nominalMeans[idx]) / nominalStds[idx]
            if (z > maxZ) {
                maxZ = z
                maxIdx = idx
            }
        }

        val topSensor = featureNames[maxIdx]
        val topVal = when (maxIdx) {
            0 -> reading.flowRateLpm
            1 -> reading.pressureBar
            2 -> reading.temperatureC
            3 -> reading.workloadPct
            else -> reading.ambientTempC
        }

        val severity = when {
            score >= 0.68 || maxZ >= 3.4 -> AnomalySeverity.CRITICAL
            score >= 0.56 || maxZ >= 2.2 -> AnomalySeverity.WARNING
            else -> AnomalySeverity.NORMAL
        }

        val direction = if (topVal >= nominalMeans[maxIdx]) "above" else "below"
        val summary = "$topSensor is %.1fσ %s nominal baseline (IF score %.2f)".format(
            maxZ,
            direction,
            score
        )

        val result = IsolationResult(
            score = score,
            severity = severity,
            topContributingSensor = topSensor,
            featureDeviationSummary = summary
        )
        lastKey = key
        lastResult = result
        return result
    }

    private fun buildTree(data: List<DoubleArray>, depth: Int, rng: Random): ITreeNode {
        if (depth >= maxDepth || data.size <= 1) {
            return ITreeNode.Leaf(data.size)
        }
        val featureIdx = rng.nextInt(5)
        var minVal = Double.POSITIVE_INFINITY
        var maxVal = Double.NEGATIVE_INFINITY
        for (i in data.indices) {
            val v = data[i][featureIdx]
            if (v < minVal) minVal = v
            if (v > maxVal) maxVal = v
        }
        if (maxVal - minVal < 1e-6) {
            return ITreeNode.Leaf(data.size)
        }
        val split = minVal + rng.nextDouble() * (maxVal - minVal)
        val left = ArrayList<DoubleArray>(data.size / 2 + 1)
        val right = ArrayList<DoubleArray>(data.size / 2 + 1)
        for (i in data.indices) {
            val row = data[i]
            if (row[featureIdx] < split) left.add(row) else right.add(row)
        }
        return ITreeNode.Internal(
            featureIndex = featureIdx,
            splitValue = split,
            left = buildTree(left, depth + 1, rng),
            right = buildTree(right, depth + 1, rng)
        )
    }

    private fun pathLength(
        f0: Double,
        f1: Double,
        f2: Double,
        f3: Double,
        f4: Double,
        node: ITreeNode
    ): Double {
        var cur = node
        var depth = 0
        while (cur is ITreeNode.Internal) {
            val value = when (cur.featureIndex) {
                0 -> f0
                1 -> f1
                2 -> f2
                3 -> f3
                else -> f4
            }
            cur = if (value < cur.splitValue) cur.left else cur.right
            depth++
        }
        val leafSize = (cur as ITreeNode.Leaf).size
        val cLeaf = if (leafSize < cTable.size) cTable[leafSize] else computeAveragePathLengthC(leafSize)
        return depth + cLeaf
    }

    private fun computeAveragePathLengthC(n: Int): Double {
        if (n <= 1) return 0.0
        if (n == 2) return 1.0
        val harmonic = ln((n - 1).toDouble()) + 0.5772156649
        return 2.0 * harmonic - (2.0 * (n - 1).toDouble() / n.toDouble())
    }

    private fun nextGaussian(rng: Random): Double {
        val u1 = rng.nextDouble().coerceAtLeast(1e-7)
        val u2 = rng.nextDouble()
        return kotlin.math.sqrt(-2.0 * ln(u1)) * kotlin.math.cos(2.0 * Math.PI * u2)
    }
}
