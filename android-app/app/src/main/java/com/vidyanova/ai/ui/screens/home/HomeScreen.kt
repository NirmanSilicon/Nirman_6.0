package com.vidyanova.ai.ui.screens.home

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.vidyanova.ai.data.local.datastore.UserPreferences
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vidyanova.ai.ui.components.AppLogoIcon
import com.vidyanova.ai.ui.components.ProgressCard
import com.vidyanova.ai.ui.components.SubjectCard
import com.vidyanova.ai.ui.models.ModelExamItem
import com.vidyanova.ai.ui.theme.BannerOrange
import com.vidyanova.ai.ui.theme.BannerPurple
import com.vidyanova.ai.ui.theme.HeaderGradientBottom
import com.vidyanova.ai.ui.theme.HeaderGradientTop
import com.vidyanova.ai.ui.theme.Primary
import com.vidyanova.ai.ui.theme.PrimaryText
import com.vidyanova.ai.ui.theme.Secondary
import com.vidyanova.ai.ui.theme.SecondaryText
import com.vidyanova.ai.ui.theme.Success
import com.vidyanova.ai.ui.theme.Warning
import kotlinx.coroutines.launch

data class QuickActionItem(
    val title: String,
    val icon: ImageVector,
    val color: Color,
    val route: String
)

@Composable
fun HomeScreen(
    onNavigateTo: (String) -> Unit
) {
    val context = LocalContext.current
    val userPrefs = remember(context) { UserPreferences(context.applicationContext) }
    val selectedClassLevel by userPrefs.classLevelFlow.collectAsState(initial = 10)
    var showClassDialog by remember { mutableStateOf(false) }

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()

    if (showClassDialog) {
        AlertDialog(
            onDismissRequest = { showClassDialog = false },
            title = { Text("Select Your Class (1 to 10)", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    (1..10).forEach { level ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    coroutineScope.launch {
                                        userPrefs.saveClassLevel(level)
                                        showClassDialog = false
                                    }
                                }
                                .padding(vertical = 10.dp, horizontal = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Class $level",
                                fontSize = 16.sp,
                                fontWeight = if (level == selectedClassLevel) FontWeight.Bold else FontWeight.Normal,
                                color = if (level == selectedClassLevel) Primary else PrimaryText
                            )
                            if (level == selectedClassLevel) {
                                Text("✓", color = Primary, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showClassDialog = false }) {
                    Text("Close")
                }
            }
        )
    }

    val quickActions = listOf(
        QuickActionItem("Ask ViyaAI", Icons.Default.AutoAwesome, Primary, "tutor"),
        QuickActionItem("Scan & Learn", Icons.Default.CameraAlt, Secondary, "scanLearn"),
        QuickActionItem("Practice Quiz", Icons.Default.Quiz, Color(0xFF0284C7), "quiz"),
        QuickActionItem("My Progress", Icons.Default.Leaderboard, Success, "progress"),
        QuickActionItem("Focus Mode", Icons.Default.HourglassTop, Warning, "focusMode"),
        QuickActionItem("Opportunities", Icons.Default.Star, Color(0xFFD97706), "opportunities"),
        QuickActionItem("Teacher Slip", Icons.Default.Description, Color(0xFF0D9488), "teacherSlip"),
        QuickActionItem("Parent Zone", Icons.Default.Security, Color(0xFF475569), "parentPin")
    )

    val modelExams = listOf(
        ModelExamItem("1", "41st BCS Model Test", "Full syllabus coverage & practice", BannerOrange),
        ModelExamItem("2", "42nd BCS Model Test", "Special medical & general test", BannerPurple),
        ModelExamItem("3", "Primary Teacher Exam", "Complete primary mock test", BannerOrange)
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AppLogoIcon(modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "VidyaAI Menu",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryText
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    NavigationDrawerItem(
                        label = { Text("Home") },
                        selected = true,
                        onClick = { coroutineScope.launch { drawerState.close() } }
                    )
                    NavigationDrawerItem(
                        label = { Text("Change Class (Current: Class $selectedClassLevel)") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            showClassDialog = true
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text("ViyaAI Tutor") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateTo("tutor")
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text("My Progress") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateTo("progress")
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text("Settings") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateTo("settings")
                        }
                    )
                }
            }
        }
    ) {
        Scaffold(
            floatingActionButton = {
                FloatingActionButton(
                    onClick = { onNavigateTo("tutor") },
                    containerColor = Primary,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(50)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "Ask ViyaAI",
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Ask ViyaAI",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            },
            bottomBar = {
                HomeBottomNavigationBar(
                    selectedTab = "home",
                    onSelectTab = { tab ->
                        when (tab) {
                            "home" -> {}
                            "subjects" -> onNavigateTo("subjects")
                            "viya_ai" -> onNavigateTo("tutor")
                            "progress" -> onNavigateTo("progress")
                            "settings" -> onNavigateTo("settings")
                        }
                    }
                )
            }
        ) { innerPadding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF5F5F5))
                    .padding(innerPadding)
            ) {
                // Curved Orange Header Banner
                item {
                    HeaderBanner(
                        classLevel = selectedClassLevel,
                        onOpenMenu = { coroutineScope.launch { drawerState.open() } },
                        onStartQuiz = { onNavigateTo("quiz") },
                        onChangeClass = { showClassDialog = true }
                    )
                }

                // Quick Actions Section
                item {
                    Column(modifier = Modifier.padding(top = 16.dp)) {
                        Text(
                            text = "Quick Actions",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryText,
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
                        )

                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(quickActions) { action ->
                                Card(
                                    modifier = Modifier
                                        .width(120.dp)
                                        .shadow(3.dp, RoundedCornerShape(16.dp))
                                        .clickable { onNavigateTo(action.route) },
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(44.dp)
                                                .background(action.color.copy(alpha = 0.12f), CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = action.icon,
                                                contentDescription = action.title,
                                                tint = action.color,
                                                modifier = Modifier.size(22.dp)
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Text(
                                            text = action.title,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = PrimaryText,
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Today's Progress Grid Section
                item {
                    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                        Text(
                            text = "Today's Progress",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryText
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            ProgressCard(
                                title = "Study Time",
                                value = "45m",
                                subtitle = "Goal: 60m",
                                accent = Primary,
                                modifier = Modifier.weight(1f)
                            )
                            ProgressCard(
                                title = "Topics Learned",
                                value = "3",
                                subtitle = "Science & Math",
                                accent = Secondary,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            ProgressCard(
                                title = "Quiz Score",
                                value = "88%",
                                subtitle = "Last: Physics",
                                accent = Success,
                                modifier = Modifier.weight(1f)
                            )
                            ProgressCard(
                                title = "Current Streak",
                                value = "5 Days",
                                subtitle = "Personal Best 🔥",
                                accent = Warning,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Subjects Section
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Subjects",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryText
                        )
                        Text(
                            text = "View All",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary,
                            modifier = Modifier.clickable { onNavigateTo("subjects") }
                        )
                    }
                }

                item {
                    Column(
                        modifier = Modifier.padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        SubjectCard(
                            name = "Mathematics",
                            chapters = 15,
                            progress = 72,
                            icon = Icons.Default.Calculate,
                            accentColor = Primary,
                            onClick = { onNavigateTo("subjects") }
                        )
                        SubjectCard(
                            name = "Science",
                            chapters = 16,
                            progress = 58,
                            icon = Icons.Default.Science,
                            accentColor = Secondary,
                            onClick = { onNavigateTo("subjects") }
                        )
                        SubjectCard(
                            name = "English",
                            chapters = 12,
                            progress = 85,
                            icon = Icons.Default.Language,
                            accentColor = Color(0xFF0284C7),
                            onClick = { onNavigateTo("subjects") }
                        )
                    }
                }

                // Model Exam Section
                item {
                    Column(
                        modifier = Modifier.padding(vertical = 16.dp)
                    ) {
                        Text(
                            text = "Explore our new model exam",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryText,
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
                        )

                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            items(modelExams) { exam ->
                                ModelExamCard(
                                    item = exam,
                                    onClick = { onNavigateTo("quiz") }
                                )
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
fun HeaderBanner(
    classLevel: Int = 10,
    onOpenMenu: () -> Unit,
    onStartQuiz: () -> Unit,
    onChangeClass: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(340.dp)
    ) {
        // Curved Wave Background Canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            val path = Path().apply {
                lineTo(0f, height - 60f)
                cubicTo(
                    width * 0.35f, height + 15f,
                    width * 0.65f, height - 100f,
                    width, height - 35f
                )
                lineTo(width, 0f)
                close()
            }

            drawPath(
                path = path,
                brush = Brush.verticalGradient(
                    colors = listOf(HeaderGradientTop, HeaderGradientBottom)
                )
            )

            // Top-Right Abstract Decorative Orbs
            drawCircle(
                color = Color(0xFFFF9800).copy(alpha = 0.35f),
                radius = 120f,
                center = Offset(width - 15f, 40f)
            )
            drawCircle(
                color = Color(0xFFFFB74D).copy(alpha = 0.25f),
                radius = 75f,
                center = Offset(width - 70f, 95f)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 18.dp)
        ) {
            // Header Top Bar with Menu, VidyaAI logo, and Class Selector Badge
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onOpenMenu) {
                    Icon(
                        imageVector = Icons.Default.Menu,
                        contentDescription = "Menu",
                        tint = PrimaryText,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    AppLogoIcon(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "VidyaAI",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryText
                    )
                }

                // Class Selector Quick Pill
                Surface(
                    color = Color.White.copy(alpha = 0.90f),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier.clickable { onChangeClass() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = Secondary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Class $classLevel ▾",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryText
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Main Banner Content Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Column: Headline, Subtitle, and Call to Action
                Column(
                    modifier = Modifier.weight(1.0f),
                    verticalArrangement = Arrangement.Center
                ) {
                    // Small Badge
                    Surface(
                        color = PrimaryText.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "🎯 Practice & Excel",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryText,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    val annotatedText = buildAnnotatedString {
                        append("Start your\n")
                        withStyle(SpanStyle(fontWeight = FontWeight.ExtraBold, color = PrimaryText)) {
                            append("Practice Test")
                        }
                    }

                    Text(
                        text = annotatedText,
                        fontSize = 22.sp,
                        color = PrimaryText,
                        lineHeight = 28.sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Create customized tests, practice topics & stay top of your class!",
                        fontSize = 12.sp,
                        color = SecondaryText,
                        lineHeight = 16.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Action Button
                    Surface(
                        modifier = Modifier
                            .shadow(4.dp, RoundedCornerShape(50))
                            .clickable { onStartQuiz() },
                        color = PrimaryText,
                        shape = RoundedCornerShape(50)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Quiz,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Take Quiz",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(6.dp))

                // Right Illustration: Large, Prominent, Scaled Beautifully
                Box(
                    modifier = Modifier
                        .weight(1.2f)
                        .fillMaxHeight(),
                    contentAlignment = Alignment.Center
                ) {
                    StudyIllustration(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 12.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun StudyIllustration(
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height

        if (width <= 0f || height <= 0f) return@Canvas

        // 1. Desk Base Position
        val deskY = height * 0.78f
        val deskHeight = height * 0.08f

        // 2. Desk Lamp Light Cone (Soft Warm Glow)
        val lampLightPath = Path().apply {
            moveTo(width * 0.22f, height * 0.22f)
            lineTo(width * 0.02f, deskY)
            lineTo(width * 0.62f, deskY)
            close()
        }
        drawPath(
            path = lampLightPath,
            brush = Brush.verticalGradient(
                colors = listOf(Color(0xFFFFF59D).copy(alpha = 0.40f), Color.Transparent),
                startY = height * 0.22f,
                endY = deskY
            )
        )

        // 3. Ambient Glow Circles
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(Color.White.copy(alpha = 0.25f), Color.Transparent),
                center = Offset(width * 0.72f, height * 0.35f),
                radius = width * 0.40f
            ),
            radius = width * 0.40f,
            center = Offset(width * 0.72f, height * 0.35f)
        )

        // 4. Desk Legs (Solid Wooden Legs)
        drawRoundRect(
            color = Color(0xFF4E342E),
            topLeft = Offset(width * 0.08f, deskY + deskHeight),
            size = Size(width * 0.045f, height * 0.18f),
            cornerRadius = CornerRadius(width * 0.01f, width * 0.01f)
        )
        drawRoundRect(
            color = Color(0xFF4E342E),
            topLeft = Offset(width * 0.86f, deskY + deskHeight),
            size = Size(width * 0.045f, height * 0.18f),
            cornerRadius = CornerRadius(width * 0.01f, width * 0.01f)
        )

        // Table Shadow
        drawRoundRect(
            color = Color.Black.copy(alpha = 0.12f),
            topLeft = Offset(width * 0.02f, deskY + deskHeight),
            size = Size(width * 0.96f, height * 0.025f),
            cornerRadius = CornerRadius(width * 0.02f, width * 0.02f)
        )

        // Table Surface
        drawRoundRect(
            brush = Brush.horizontalGradient(
                colors = listOf(Color(0xFF795548), Color(0xFF5D4037), Color(0xFF795548))
            ),
            topLeft = Offset(0f, deskY),
            size = Size(width, deskHeight),
            cornerRadius = CornerRadius(width * 0.025f, width * 0.025f)
        )
        // Table Bevel Highlight Line
        drawRoundRect(
            color = Color(0xFFA1887F).copy(alpha = 0.6f),
            topLeft = Offset(0f, deskY),
            size = Size(width, deskHeight * 0.20f),
            cornerRadius = CornerRadius(width * 0.025f, width * 0.025f)
        )

        // 5. Chair (Modern White & Teal Ergonomic Chair)
        // Chair Backrest
        drawRoundRect(
            color = Color.White,
            topLeft = Offset(width * 0.66f, height * 0.36f),
            size = Size(width * 0.24f, height * 0.42f),
            cornerRadius = CornerRadius(width * 0.04f, width * 0.04f)
        )
        // Cushion Interior
        drawRoundRect(
            color = Color(0xFF00897B).copy(alpha = 0.25f),
            topLeft = Offset(width * 0.68f, height * 0.39f),
            size = Size(width * 0.20f, height * 0.36f),
            cornerRadius = CornerRadius(width * 0.03f, width * 0.03f)
        )
        // Chair Leg / Pole
        drawRect(
            color = Color(0xFF78909C),
            topLeft = Offset(width * 0.76f, height * 0.78f),
            size = Size(width * 0.04f, height * 0.18f)
        )

        // 6. Student Character (Girl studying intently)
        // Hair Ponytail
        drawOval(
            color = Color(0xFF1E1E2D),
            topLeft = Offset(width * 0.84f, height * 0.18f),
            size = Size(width * 0.11f, height * 0.24f)
        )
        // Hair Bun Band
        drawCircle(
            color = Color(0xFFFF5722),
            radius = width * 0.025f,
            center = Offset(width * 0.85f, height * 0.20f)
        )
        // Main Hair Mass
        drawCircle(
            color = Color(0xFF1E1E2D),
            radius = width * 0.14f,
            center = Offset(width * 0.73f, height * 0.22f)
        )
        // Face / Neck (Warm Skin Tone)
        drawCircle(
            color = Color(0xFFFFCC80),
            radius = width * 0.10f,
            center = Offset(width * 0.68f, height * 0.25f)
        )
        // Hair Front Fringe
        val hairFront = Path().apply {
            moveTo(width * 0.58f, height * 0.20f)
            cubicTo(
                width * 0.64f, height * 0.12f,
                width * 0.76f, height * 0.14f,
                width * 0.80f, height * 0.22f
            )
            lineTo(width * 0.72f, height * 0.18f)
            close()
        }
        drawPath(path = hairFront, color = Color(0xFF1E1E2D))

        // Torso / Orange Shirt
        drawRoundRect(
            brush = Brush.verticalGradient(
                colors = listOf(Color(0xFFF4511E), Color(0xFFD84315))
            ),
            topLeft = Offset(width * 0.60f, height * 0.36f),
            size = Size(width * 0.25f, height * 0.34f),
            cornerRadius = CornerRadius(width * 0.05f, width * 0.05f)
        )

        // Arm leaning forward onto keyboard
        val armPath = Path().apply {
            moveTo(width * 0.64f, height * 0.44f)
            lineTo(width * 0.46f, height * 0.76f)
            lineTo(width * 0.53f, height * 0.80f)
            lineTo(width * 0.71f, height * 0.48f)
            close()
        }
        drawPath(path = armPath, color = Color(0xFFFF7043))
        // Hand resting near laptop
        drawOval(
            color = Color(0xFFFFCC80),
            topLeft = Offset(width * 0.44f, height * 0.75f),
            size = Size(width * 0.08f, height * 0.05f)
        )

        // 7. Desk Lamp (Modern Orange & Charcoal Lamp)
        val lampBaseX = width * 0.18f
        // Base
        drawOval(
            color = Color(0xFF37474F),
            topLeft = Offset(lampBaseX, deskY - height * 0.02f),
            size = Size(width * 0.09f, height * 0.04f)
        )
        // Curved Stem
        val lampStem = Path().apply {
            moveTo(lampBaseX + width * 0.045f, deskY - height * 0.01f)
            cubicTo(
                lampBaseX + width * 0.045f, height * 0.35f,
                width * 0.12f, height * 0.22f,
                width * 0.24f, height * 0.20f
            )
        }
        drawPath(
            path = lampStem,
            color = Color(0xFF455A64),
            style = Stroke(width = width * 0.025f, cap = StrokeCap.Round)
        )
        // Lamp Head Shade
        val lampShade = Path().apply {
            moveTo(width * 0.18f, height * 0.24f)
            lineTo(width * 0.26f, height * 0.16f)
            lineTo(width * 0.30f, height * 0.25f)
            close()
        }
        drawPath(path = lampShade, color = Color(0xFFF57C00))

        // 8. Laptop on Desk
        val laptopX = width * 0.27f
        val laptopW = width * 0.32f
        val laptopH = height * 0.28f

        // Outer Screen Shadow
        drawRoundRect(
            color = Color.Black.copy(alpha = 0.22f),
            topLeft = Offset(laptopX - width * 0.01f, deskY - laptopH),
            size = Size(laptopW + width * 0.02f, laptopH),
            cornerRadius = CornerRadius(width * 0.02f, width * 0.02f)
        )
        // Laptop Screen Outer Frame
        drawRoundRect(
            color = Color(0xFF263238),
            topLeft = Offset(laptopX, deskY - laptopH),
            size = Size(laptopW, laptopH),
            cornerRadius = CornerRadius(width * 0.02f, width * 0.02f)
        )
        // Laptop Screen Inner Glow (Cyan / Soft White Display)
        drawRoundRect(
            brush = Brush.verticalGradient(
                colors = listOf(Color(0xFFE0F7FA), Color(0xFF80DEEA))
            ),
            topLeft = Offset(laptopX + width * 0.015f, deskY - laptopH + height * 0.015f),
            size = Size(laptopW - width * 0.03f, laptopH - height * 0.03f),
            cornerRadius = CornerRadius(width * 0.012f, width * 0.012f)
        )
        // UI Code / Graph Lines on Screen
        val startY = deskY - laptopH + height * 0.04f
        drawRoundRect(
            color = Color(0xFF0284C7),
            topLeft = Offset(laptopX + width * 0.03f, startY),
            size = Size(laptopW * 0.42f, height * 0.028f),
            cornerRadius = CornerRadius(4f, 4f)
        )
        drawRoundRect(
            color = Color(0xFFF5A623),
            topLeft = Offset(laptopX + width * 0.03f, startY + height * 0.045f),
            size = Size(laptopW * 0.65f, height * 0.022f),
            cornerRadius = CornerRadius(4f, 4f)
        )
        drawRoundRect(
            color = Color(0xFF10B981),
            topLeft = Offset(laptopX + width * 0.03f, startY + height * 0.08f),
            size = Size(laptopW * 0.52f, height * 0.022f),
            cornerRadius = CornerRadius(4f, 4f)
        )
        // Laptop Keyboard Base
        drawRoundRect(
            color = Color(0xFF37474F),
            topLeft = Offset(laptopX - width * 0.04f, deskY - height * 0.035f),
            size = Size(laptopW + width * 0.08f, height * 0.04f),
            cornerRadius = CornerRadius(width * 0.012f, width * 0.012f)
        )
        // Trackpad
        drawRect(
            color = Color(0xFF546E7A),
            topLeft = Offset(laptopX + laptopW * 0.35f, deskY - height * 0.018f),
            size = Size(laptopW * 0.30f, height * 0.015f)
        )

        // 9. Stack of Colorful Books
        val bX = width * 0.05f
        // Book 1 (Bottom Teal)
        drawRoundRect(
            color = Color(0xFF00897B),
            topLeft = Offset(bX, deskY - height * 0.05f),
            size = Size(width * 0.19f, height * 0.05f),
            cornerRadius = CornerRadius(width * 0.008f, width * 0.008f)
        )
        drawRect(
            color = Color(0xFFFFF9C4),
            topLeft = Offset(bX + width * 0.16f, deskY - height * 0.045f),
            size = Size(width * 0.025f, height * 0.04f)
        )

        // Book 2 (Middle Purple)
        drawRoundRect(
            color = Color(0xFF7E57C2),
            topLeft = Offset(bX + width * 0.01f, deskY - height * 0.098f),
            size = Size(width * 0.17f, height * 0.045f),
            cornerRadius = CornerRadius(width * 0.008f, width * 0.008f)
        )
        drawRect(
            color = Color(0xFFFFF9C4),
            topLeft = Offset(bX + width * 0.15f, deskY - height * 0.092f),
            size = Size(width * 0.025f, height * 0.035f)
        )

        // Book 3 (Top Coral Red)
        drawRoundRect(
            color = Color(0xFFEF5350),
            topLeft = Offset(bX + width * 0.02f, deskY - height * 0.142f),
            size = Size(width * 0.15f, height * 0.042f),
            cornerRadius = CornerRadius(width * 0.008f, width * 0.008f)
        )
        drawRect(
            color = Color(0xFFFFF9C4),
            topLeft = Offset(bX + width * 0.14f, deskY - height * 0.138f),
            size = Size(width * 0.025f, height * 0.032f)
        )

        // 10. Decorative Sparkles / Floating Magic Dots
        drawCircle(
            color = Color.White.copy(alpha = 0.95f),
            radius = width * 0.020f,
            center = Offset(width * 0.12f, height * 0.10f)
        )
        drawCircle(
            color = Color(0xFFFFD54F),
            radius = width * 0.028f,
            center = Offset(width * 0.48f, height * 0.08f)
        )
        drawCircle(
            color = Color.White.copy(alpha = 0.85f),
            radius = width * 0.018f,
            center = Offset(width * 0.92f, height * 0.12f)
        )
    }
}

@Composable
fun ModelExamCard(
    item: ModelExamItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(220.dp)
            .shadow(4.dp, RoundedCornerShape(16.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column {
            // Top Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(110.dp)
                    .background(item.bannerColor),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Quiz,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "VidyaAI Model Test",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            // Card Body
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = item.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = PrimaryText
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.subtitle,
                    fontSize = 11.sp,
                    color = SecondaryText,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
fun HomeBottomNavigationBar(
    selectedTab: String,
    onSelectTab: (String) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.White,
        shadowElevation = 12.dp,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val tabs = listOf(
                Triple("home", "Home", Icons.Default.Home),
                Triple("subjects", "Subjects", Icons.AutoMirrored.Filled.MenuBook),
                Triple("viya_ai", "ViyaAI", Icons.Default.AutoAwesome),
                Triple("progress", "Progress", Icons.Default.Leaderboard),
                Triple("settings", "Settings", Icons.Default.Settings)
            )

            tabs.forEach { (route, label, icon) ->
                val isSelected = selectedTab == route
                val tint = if (isSelected) Primary else SecondaryText

                Column(
                    modifier = Modifier
                        .clickable { onSelectTab(route) }
                        .padding(horizontal = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = tint,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = label,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = tint
                    )
                }
            }
        }
    }
}
