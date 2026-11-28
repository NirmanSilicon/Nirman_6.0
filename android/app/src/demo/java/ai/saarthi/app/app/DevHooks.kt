package ai.saarthi.app.app

import android.content.Context

/** The demo build has no developer hooks (PRD rule 7.1); see the dev flavour's DevHooks. */
object DevHooks {
    fun install(context: Context, core: SaarthiCore) {}
    fun uninstall(context: Context) {}
}
