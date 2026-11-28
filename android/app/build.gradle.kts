plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "ai.saarthi.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "ai.saarthi.app"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-phase1"
        ndk { abiFilters += listOf("arm64-v8a") }
    }

    // Two flavours (PRD rule 7.1): `dev` holds benchmarks, tools and anything simulated, always
    // labelled; `demo` is the stage build and cannot contain them, because their source set is
    // not compiled into it.
    flavorDimensions += "build"
    productFlavors {
        create("dev") {
            dimension = "build"
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
            // Live camera view with detection boxes on the phone screen, for the team (D13).
            buildConfigField("boolean", "CAMERA_VIEW", "true")
        }
        create("demo") {
            dimension = "build"
            buildConfigField("boolean", "CAMERA_VIEW", "false")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }

    // Models are memory-mapped straight from the APK, so they must not be compressed.
    androidResources {
        noCompress += listOf("tflite", "task", "onnx")
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity)

    // Camera is used by the dev benchmark now and by perception from Phase 1.
    implementation(libs.camerax.core)
    implementation(libs.camerax.camera2)
    implementation(libs.camerax.lifecycle)
    implementation(libs.camerax.view)   // on-screen camera view (dev build, D13)

    // Fast-tier perception (object detector; hand landmarker from Phase 2).
    implementation(libs.mediapipe.tasks.vision)

    // Offline speech recognition (Whisper via sherpa-onnx, Apache-2.0). The AAR is fetched with a
    // pinned checksum by tools/fetch_models.sh, not stored in git (D17).
    implementation(files("libs/sherpa-onnx-1.13.4.aar"))

    // Phase 0 benchmarks only (dev). Moved to `implementation` when a feature adopts them.
    "devImplementation"(libs.tflite)          // raw interpreter, for the NNAPI (APU) check
    // Text reading (PRD 5.7, brought forward by the team on 30 Oct): ML Kit, bundled models, offline.
    implementation(libs.mlkit.text.latin)
    implementation(libs.mlkit.text.devanagari)

    testImplementation(libs.junit)
}
