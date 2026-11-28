package com.example.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.PermanentDrawerSheet
import androidx.compose.material3.PermanentNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.components.StatusPill
import com.example.ui.screens.AgentsScreen
import com.example.ui.screens.AnomalyScreen
import com.example.ui.screens.DigitalTwinScreen
import com.example.ui.screens.MonitoringScreen
import com.example.ui.screens.OptimizationScreen
import com.example.ui.screens.OverviewScreen
import com.example.ui.screens.PredictionsScreen
import com.example.ui.screens.ReportsScreen
import com.example.ui.screens.SafeControlScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyCard
import com.example.ui.theme.NavySurface
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorderBright
import com.example.ui.theme.SlateDivider
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.TextTertiary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState
import kotlinx.coroutines.launch

@Composable
fun AquaDashboardShell(viewModel: AquaComputeViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var currentSection by rememberSaveable { mutableStateOf(AquaSection.OVERVIEW) }
    val snackbarHostState = remember { SnackbarHostState() }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner, viewModel) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> viewModel.setForegroundActive(true)
                Lifecycle.Event.ON_STOP -> viewModel.setForegroundActive(false)
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(state.statusBannerMessage) {
        state.statusBannerMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearBanner()
        }
    }

    BackHandler(enabled = currentSection != AquaSection.OVERVIEW) {
        currentSection = AquaSection.OVERVIEW
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize().background(NavyVoid)) {
        val isExpandedLayout = maxWidth >= 840.dp
        val isMediumLayout = maxWidth >= 600.dp && maxWidth < 840.dp

        if (isExpandedLayout) {
            PermanentNavigationDrawer(
                drawerContent = {
                    PermanentDrawerSheet(
                        modifier = Modifier.width(272.dp),
                        drawerContainerColor = NavySurface
                    ) {
                        SidebarDrawerContent(
                            currentSection = currentSection,
                            activeAnomalies = state.activeAnomaliesCount,
                            isSimulationRunning = state.isSimulationRunning,
                            operatingModeLabel = state.operatingMode.label,
                            onSelect = { currentSection = it }
                        )
                    }
                }
            ) {
                DashboardScaffold(
                    currentSection = currentSection,
                    state = state,
                    viewModel = viewModel,
                    snackbarHostState = snackbarHostState,
                    showMenuButton = false,
                    showBottomBar = false,
                    showNavRail = false,
                    onMenuClick = {},
                    onNavigate = { currentSection = it }
                )
            }
        } else {
            val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
            val scope = rememberCoroutineScope()

            ModalNavigationDrawer(
                drawerState = drawerState,
                drawerContent = {
                    ModalDrawerSheet(
                        modifier = Modifier.width(288.dp),
                        drawerContainerColor = NavySurface
                    ) {
                        SidebarDrawerContent(
                            currentSection = currentSection,
                            activeAnomalies = state.activeAnomaliesCount,
                            isSimulationRunning = state.isSimulationRunning,
                            operatingModeLabel = state.operatingMode.label,
                            onSelect = { section ->
                                currentSection = section
                                scope.launch { drawerState.close() }
                            }
                        )
                    }
                }
            ) {
                DashboardScaffold(
                    currentSection = currentSection,
                    state = state,
                    viewModel = viewModel,
                    snackbarHostState = snackbarHostState,
                    showMenuButton = true,
                    showBottomBar = !isMediumLayout,
                    showNavRail = isMediumLayout,
                    onMenuClick = { scope.launch { drawerState.open() } },
                    onNavigate = { currentSection = it }
                )
            }
        }
    }
}

@Composable
private fun SidebarDrawerContent(
    currentSection: AquaSection,
    activeAnomalies: Int,
    isSimulationRunning: Boolean,
    operatingModeLabel: String,
    onSelect: (AquaSection) -> Unit
) {
    val groups = remember {
        listOf(
            "INTELLIGENCE" to listOf(
                AquaSection.OVERVIEW,
                AquaSection.MONITORING,
                AquaSection.AGENTS,
                AquaSection.PREDICTIONS
            ),
            "OPERATIONS" to listOf(
                AquaSection.ANOMALIES,
                AquaSection.OPTIMIZATION,
                AquaSection.DIGITAL_TWIN,
                AquaSection.SAFE_CONTROL
            ),
            "STEWARDSHIP" to listOf(
                AquaSection.REPORTS,
                AquaSection.SETTINGS
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 16.dp, horizontal = 12.dp)
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = NavyCard,
            border = BorderStroke(1.dp, SlateBorderBright.copy(alpha = 0.7f))
        ) {
            Column(
                modifier = Modifier
                    .background(
                        Brush.linearGradient(
                            colors = listOf(AquaCyan.copy(alpha = 0.14f), NavyCard)
                        )
                    )
                    .padding(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = AquaCyan.copy(alpha = 0.18f),
                        border = BorderStroke(1.dp, AquaCyan.copy(alpha = 0.45f)),
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.WaterDrop,
                                contentDescription = "AquaCompute AI Logo",
                                tint = AquaCyan,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text("AquaCompute AI", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                        Text("Water Intelligence Platform", style = MaterialTheme.typography.labelSmall, color = AquaTeal)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    StatusPill(
                        label = if (isSimulationRunning) "SIM LIVE" else "PAUSED",
                        color = if (isSimulationRunning) EmeraldOk else AmberWarn
                    )
                    StatusPill(
                        label = operatingModeLabel.uppercase(),
                        color = AquaCyan,
                        showDot = false
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        groups.forEach { (groupTitle, items) ->
            Text(
                text = groupTitle,
                style = MaterialTheme.typography.labelSmall,
                color = TextTertiary,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
            )
            items.forEach { section ->
                val selected = currentSection == section
                NavigationDrawerItem(
                    label = { Text(section.title, style = MaterialTheme.typography.labelLarge) },
                    selected = selected,
                    onClick = { onSelect(section) },
                    icon = {
                        if (section == AquaSection.ANOMALIES && activeAnomalies > 0) {
                            BadgedBox(badge = { Badge(containerColor = CoralCritical) { Text("$activeAnomalies") } }) {
                                Icon(section.icon, contentDescription = section.title)
                            }
                        } else {
                            Icon(section.icon, contentDescription = section.title)
                        }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = AquaCyan.copy(alpha = 0.16f),
                        selectedIconColor = AquaCyan,
                        selectedTextColor = AquaCyan,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .padding(vertical = 2.dp)
                        .testTag("drawer_${section.routeId}")
                )
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DashboardScaffold(
    currentSection: AquaSection,
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel,
    snackbarHostState: SnackbarHostState,
    showMenuButton: Boolean,
    showBottomBar: Boolean,
    showNavRail: Boolean,
    onMenuClick: () -> Unit,
    onNavigate: (AquaSection) -> Unit
) {
    val quickTabs = remember {
        listOf(
            AquaSection.OVERVIEW,
            AquaSection.MONITORING,
            AquaSection.AGENTS,
            AquaSection.DIGITAL_TWIN,
            AquaSection.SAFE_CONTROL
        )
    }

    Scaffold(
        containerColor = NavyVoid,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Column {
                TopAppBar(
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = NavySurface,
                        titleContentColor = TextPrimary
                    ),
                    navigationIcon = {
                        if (showMenuButton) {
                            IconButton(
                                onClick = onMenuClick,
                                modifier = Modifier.testTag("open_nav_drawer")
                            ) {
                                Icon(Icons.Default.Menu, contentDescription = "Open navigation menu", tint = AquaCyan)
                            }
                        }
                    },
                    title = {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = currentSection.title,
                                    style = MaterialTheme.typography.titleLarge,
                                    color = TextPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "AquaCompute AI • ${state.streamConnectionState.badgeLabel}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (state.isSimulationRunning) AquaTeal else AmberWarn,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { viewModel.toggleSimulationRunning() },
                                    modifier = Modifier.size(40.dp)
                                ) {
                                    Icon(
                                        imageVector = if (state.isSimulationRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                                        contentDescription = if (state.isSimulationRunning) "Pause telemetry simulation" else "Resume telemetry simulation",
                                        tint = if (state.isSimulationRunning) AquaTeal else AmberWarn,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                LiveFlowStatusPill(
                                    flowRateLpm = state.currentReading.flowRateLpm,
                                    hasActiveAnomalies = state.activeAnomaliesCount > 0
                                )
                            }
                        }
                    }
                )
                HorizontalDivider(color = SlateDivider)
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = NavySurface,
                    windowInsets = WindowInsets.navigationBars
                ) {
                    quickTabs.forEach { tab ->
                        val selected = currentSection == tab
                        NavigationBarItem(
                            selected = selected,
                            onClick = { onNavigate(tab) },
                            icon = {
                                Icon(tab.icon, contentDescription = tab.shortTitle)
                            },
                            label = {
                                Text(tab.shortTitle, style = MaterialTheme.typography.labelSmall)
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = AquaCyan,
                                selectedTextColor = AquaCyan,
                                indicatorColor = AquaCyan.copy(alpha = 0.16f),
                                unselectedIconColor = TextSecondary,
                                unselectedTextColor = TextSecondary
                            ),
                            modifier = Modifier.testTag("bottom_${tab.routeId}")
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (showNavRail) {
                NavigationRail(
                    containerColor = NavySurface,
                    modifier = Modifier.fillMaxHeight()
                ) {
                    Spacer(Modifier.height(8.dp))
                    quickTabs.forEach { tab ->
                        val selected = currentSection == tab
                        NavigationRailItem(
                            selected = selected,
                            onClick = { onNavigate(tab) },
                            icon = { Icon(tab.icon, contentDescription = tab.shortTitle) },
                            label = { Text(tab.shortTitle, style = MaterialTheme.typography.labelSmall) },
                            colors = NavigationRailItemDefaults.colors(
                                selectedIconColor = AquaCyan,
                                selectedTextColor = AquaCyan,
                                indicatorColor = AquaCyan.copy(alpha = 0.16f),
                                unselectedIconColor = TextSecondary,
                                unselectedTextColor = TextSecondary
                            )
                        )
                    }
                }
            }

            Box(
                modifier = Modifier.weight(1f).fillMaxHeight(),
                contentAlignment = Alignment.TopCenter
            ) {
                Box(modifier = Modifier.widthIn(max = 1040.dp).fillMaxSize()) {
                    Crossfade(targetState = currentSection, label = "section_switch") { section ->
                        when (section) {
                            AquaSection.OVERVIEW -> OverviewScreen(state, viewModel, onNavigate)
                            AquaSection.MONITORING -> MonitoringScreen(state, viewModel)
                            AquaSection.AGENTS -> AgentsScreen(state, viewModel)
                            AquaSection.PREDICTIONS -> PredictionsScreen(state, viewModel)
                            AquaSection.ANOMALIES -> AnomalyScreen(state, viewModel)
                            AquaSection.OPTIMIZATION -> OptimizationScreen(state, viewModel)
                            AquaSection.DIGITAL_TWIN -> DigitalTwinScreen(state, viewModel)
                            AquaSection.SAFE_CONTROL -> SafeControlScreen(state, viewModel)
                            AquaSection.REPORTS -> ReportsScreen(state, viewModel)
                            AquaSection.SETTINGS -> SettingsScreen(state, viewModel)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LiveFlowStatusPill(
    flowRateLpm: Double,
    hasActiveAnomalies: Boolean
) {
    StatusPill(
        label = "%.1f L/m".format(flowRateLpm),
        color = if (hasActiveAnomalies) CoralCritical else EmeraldOk
    )
}
