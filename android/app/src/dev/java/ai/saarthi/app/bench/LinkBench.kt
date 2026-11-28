package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import android.os.SystemClock
import org.json.JSONObject
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import kotlin.random.Random

/**
 * Phone → laptop link latency against laptop/bench/link_server.py.
 *
 * mode "rtt": for each payload size (1 KB state message, 100 KB and 300 KB, the range of a reduced
 * JPEG frame), [count] round trips: send the payload, wait for the 16-byte acknowledgement.
 *
 * mode "pull": 1 KB pings at 10 Hz for [seconds] with a 1 s read timeout. Someone pulls the USB
 * cable during the run; the result is how long after the last good reply the phone noticed.
 *
 * Runs on a background thread (network is not allowed on the main thread).
 */
class LinkBench(
    private val host: String,
    private val port: Int,
    private val mode: String,
    private val count: Int = 50,
    private val seconds: Int = 60,
) {
    fun run(): JSONObject {
        val out = JSONObject().put("host", host).put("port", port).put("mode", mode)
        val socket = Socket()
        try {
            val t0 = SystemClock.elapsedRealtimeNanos()
            socket.connect(InetSocketAddress(host, port), 3_000)
            socket.tcpNoDelay = true
            socket.soTimeout = 1_000
            out.put("connectMs", BenchReport.round((SystemClock.elapsedRealtimeNanos() - t0) / 1e6))
            val input = DataInputStream(socket.getInputStream().buffered())
            val output = DataOutputStream(socket.getOutputStream().buffered())
            if (mode == "pull") pull(input, output, out) else rtt(input, output, out)
        } catch (e: Exception) {
            out.put("error", "${e.javaClass.simpleName}: ${e.message}")
        } finally {
            runCatching { socket.close() }
        }
        return out
    }

    private fun roundTrip(input: DataInputStream, output: DataOutputStream, payload: ByteArray): Double {
        val t0 = SystemClock.elapsedRealtimeNanos()
        output.writeInt(payload.size)
        output.write(payload)
        output.flush()
        val n = input.readInt()
        input.readFully(ByteArray(n))
        return (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
    }

    private fun rtt(input: DataInputStream, output: DataOutputStream, out: JSONObject) {
        for (size in listOf(1_024, 100_000, 300_000)) {
            val payload = Random(size).nextBytes(size)
            repeat(3) { roundTrip(input, output, payload) } // warm-up
            val ms = (1..count).map { roundTrip(input, output, payload) }
            val s = LatencyStats.summarize(ms)!!
            out.put("bytes_$size", JSONObject(BenchReport.toJson(s).toString())
                .put("throughputMBps", BenchReport.round(size / 1e6 / (s.p50Ms / 1000.0))))
        }
    }

    private fun pull(input: DataInputStream, output: DataOutputStream, out: JSONObject) {
        val payload = Random(1).nextBytes(1_024)
        val start = SystemClock.elapsedRealtime()
        var lastOk = start
        var ok = 0
        while (SystemClock.elapsedRealtime() - start < seconds * 1000L) {
            try {
                roundTrip(input, output, payload)
                lastOk = SystemClock.elapsedRealtime()
                ok++
            } catch (e: Exception) {
                val now = SystemClock.elapsedRealtime()
                out.put("failedAtSeconds", BenchReport.round((now - start) / 1000.0))
                out.put("detectedMsAfterLastGoodReply", now - lastOk)
                out.put("failure", "${e.javaClass.simpleName}: ${e.message}")
                break
            }
            Thread.sleep(100)
        }
        out.put("goodReplies", ok)
        if (!out.has("failure")) out.put("failure", "none: the link stayed up for the whole run")
    }
}
