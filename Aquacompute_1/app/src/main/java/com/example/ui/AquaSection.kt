package com.example.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ShowChart
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Hub
import androidx.compose.material.icons.filled.PrecisionManufacturing
import androidx.compose.material.icons.filled.Sensors
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.ui.graphics.vector.ImageVector

enum class AquaSection(
    val title: String,
    val shortTitle: String,
    val icon: ImageVector,
    val routeId: String
) {
    OVERVIEW("Overview", "Overview", Icons.Default.Dashboard, "overview"),
    MONITORING("Live Monitoring", "Sensors", Icons.Default.Sensors, "monitoring"),
    AGENTS("AI Agents", "Agents", Icons.Default.Hub, "agents"),
    PREDICTIONS("Predictions", "Predict", Icons.AutoMirrored.Filled.ShowChart, "predictions"),
    ANOMALIES("Anomaly Detection", "Anomalies", Icons.Default.WarningAmber, "anomalies"),
    OPTIMIZATION("Optimization", "Optimize", Icons.Default.AutoAwesome, "optimization"),
    DIGITAL_TWIN("Digital Twin", "Twin", Icons.Default.PrecisionManufacturing, "digital_twin"),
    SAFE_CONTROL("Safe Control", "Safety", Icons.Default.Shield, "safe_control"),
    REPORTS("Reports", "Reports", Icons.Default.Assessment, "reports"),
    SETTINGS("Settings", "Settings", Icons.Default.Settings, "settings")
}
