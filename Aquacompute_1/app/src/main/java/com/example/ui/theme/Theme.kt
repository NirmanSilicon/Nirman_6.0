package com.example.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val AquaDarkColorScheme = darkColorScheme(
    primary = AquaCyan,
    onPrimary = NavyVoid,
    primaryContainer = Color(0xFF0A3347),
    onPrimaryContainer = IceBlue,
    secondary = AquaTeal,
    onSecondary = NavyVoid,
    secondaryContainer = Color(0xFF0D3633),
    onSecondaryContainer = Color(0xFF99F6E4),
    tertiary = VioletAgent,
    onTertiary = Color.White,
    background = NavyVoid,
    onBackground = TextPrimary,
    surface = NavySurface,
    onSurface = TextPrimary,
    surfaceVariant = NavyCard,
    onSurfaceVariant = TextSecondary,
    surfaceContainerLowest = NavyVoid,
    surfaceContainerLow = NavySurface,
    surfaceContainer = NavyCard,
    surfaceContainerHigh = NavyCardElevated,
    surfaceContainerHighest = CharcoalPanel,
    outline = SlateBorder,
    outlineVariant = SlateDivider,
    error = CoralCritical,
    onError = Color.White,
    errorContainer = Color(0xFF450A0A),
    onErrorContainer = Color(0xFFFCA5A5)
)

val AquaShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

@Composable
fun AquaComputeTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = AquaDarkColorScheme,
        typography = AquaTypography,
        shapes = AquaShapes,
        content = content
    )
}
