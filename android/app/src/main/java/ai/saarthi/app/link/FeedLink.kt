package ai.saarthi.app.link

import android.os.SystemClock
import android.util.Log
import java.io.BufferedWriter
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.LinkedBlockingDeque
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * The phone's side of the link to the laptop (PRD 4, D9): a TCP socket to 127.0.0.1:8765, which
 * `adb reverse` tunnels over the USB cable. Sends feed messages as JSON lines; the laptop answers
 * with an ack every 500 ms, and no ack for [lostAfterMs] means the link is lost.
 *
 * Never blocks the caller: [send] only queues, and when the queue is full the oldest message is
 * dropped. While disconnected nothing is queued (stale state is useless). Reconnects by itself.
 */
class FeedLink(
    private val host: String = "127.0.0.1",
    private val port: Int = 8765,
    private val lostAfterMs: Long = 2_000L,
    private val queueSize: Int = 64,
) {
    enum class State { CONNECTING, CONNECTED, LOST }

    /** Every other line from the laptop (e.g. an online answer, D51), on the reader thread. */
    @Volatile var onMessage: (String) -> Unit = {}

    /** Called on the link thread whenever the state changes. */
    var onState: (State) -> Unit = {}

    /** Called on the link thread with the first message to send after each (re)connection. */
    var helloMessage: () -> String = { "" }

    @Volatile var state = State.CONNECTING
        private set

    private val queue = LinkedBlockingDeque<String>(queueSize)
    private val lastAckMs = AtomicLong(0)
    @Volatile private var running = true
    @Volatile private var socket: Socket? = null
    private val thread = Thread(::run, "saarthi-link").apply { isDaemon = true }

    val dropped = AtomicLong(0)
    val sent = AtomicLong(0)

    fun start() = thread.start()

    /** Queues one JSON line. Never blocks; drops the oldest message if the queue is full. */
    fun send(line: String) {
        if (state != State.CONNECTED) return
        while (!queue.offerLast(line)) {
            queue.pollFirst()
            dropped.incrementAndGet()
        }
    }

    private fun run() {
        while (running) {
            try {
                Socket().use { s ->
                    s.tcpNoDelay = true
                    s.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
                    socket = s
                    connectedAtMs = SystemClock.elapsedRealtime()
                    lastAckMs.set(0)
                    queue.clear()
                    val out = s.getOutputStream().bufferedWriter()
                    startReader(s)
                    writeLine(out, helloMessage())
                    pump(out)
                }
            } catch (e: IOException) {
                // Connection refused (laptop server not running or no adb reverse) or lost.
            } catch (e: Exception) {
                Log.e(TAG, "link error", e)
            } finally {
                socket = null
            }
            if (state == State.CONNECTED) setState(State.LOST)
            if (running) Thread.sleep(RETRY_MS)
        }
    }

    /**
     * Sends queued lines until the link drops or the laptop stops acknowledging. The link counts
     * as connected only once the laptop has acknowledged: with `adb reverse` set up but no laptop
     * server, the tunnel accepts the connection and then stays silent, which is not a link.
     */
    private fun pump(out: BufferedWriter) {
        while (running) {
            val line = queue.pollFirst(100, TimeUnit.MILLISECONDS)
            if (line != null) writeLine(out, line)
            val now = SystemClock.elapsedRealtime()
            val ack = lastAckMs.get()
            if (ack > 0 && state != State.CONNECTED) setState(State.CONNECTED)
            val silentSince = if (ack > 0) ack else connectedAtMs
            if (now - silentSince > lostAfterMs) throw IOException("no ack for $lostAfterMs ms")
        }
    }

    @Volatile private var connectedAtMs = 0L

    private fun writeLine(out: BufferedWriter, line: String) {
        if (line.isEmpty()) return
        out.write(line)
        out.write('\n'.code)
        out.flush()
        sent.incrementAndGet()
    }

    private fun startReader(s: Socket) {
        Thread({
            try {
                s.getInputStream().bufferedReader().use { r ->
                    while (true) {
                        val line = r.readLine() ?: break
                        if (ACK.containsMatchIn(line)) lastAckMs.set(SystemClock.elapsedRealtime())
                        else onMessage(line)
                    }
                }
            } catch (_: IOException) {
                // Socket closed: the writer side notices through the missing acks.
            }
        }, "saarthi-link-read").apply { isDaemon = true }.start()
    }

    private fun setState(s: State) {
        if (s == state) return
        state = s
        onState(s)
    }

    fun close() {
        running = false
        runCatching { socket?.close() }
    }

    private companion object {
        const val TAG = "Saarthi/link"
        const val CONNECT_TIMEOUT_MS = 1_000
        const val RETRY_MS = 1_000L
        /** The laptop's ack, with or without spaces after the colons (Python's json.dumps puts one). */
        val ACK = Regex("\"type\"\\s*:\\s*\"ack\"")
    }
}
