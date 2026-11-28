
import streamlit as st
import pandas as pd
import sqlite3
import io

from pathlib import Path

from modules.database import (
    DB_PATH,
    create_database,
    get_record_count
)

from modules.csv_validator import validate_factory_csv


# =====================================================
# 1. PAGE CONFIGURATION
# =====================================================

st.set_page_config(
    page_title="WattWise | Factory Data Upload",
    page_icon="📤",
    layout="wide"
)

create_database()


# =====================================================
# 2. CUSTOM DESIGN
# =====================================================

st.markdown("""
<style>

.stApp {
    background: #080F1D;
    color: #E8F1FC;
}

.block-container {
    max-width: 1450px;
    padding-top: 2rem;
}

h1, h2, h3 {
    color: #F1F7FF !important;
}

.upload-hero {
    background: linear-gradient(115deg, #142B48, #075985);
    border: 1px solid #23648A;
    border-radius: 18px;
    padding: 30px;
    margin-bottom: 25px;
}

.upload-tag {
    color: #7DD3FC;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 2px;
}

.upload-heading {
    color: white;
    font-size: 32px;
    font-weight: 850;
    margin-top: 12px;
}

.upload-description {
    color: #D3E8F8;
    font-size: 14px;
    margin-top: 12px;
    line-height: 1.8;
}

.info-card {
    background: #142238;
    border: 1px solid #293E59;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 15px;
}

.metric-value {
    color: #38BDF8;
    font-size: 27px;
    font-weight: 850;
}

.metric-label {
    color: #9CB2CC;
    font-size: 12px;
}

.section-heading {
    color: #F1F5F9;
    font-size: 20px;
    font-weight: 800;
    margin-top: 25px;
    margin-bottom: 15px;
}

.stButton > button {
    background: linear-gradient(90deg, #0284C7, #0369A1);
    color: white;
    border: 1px solid #0EA5E9;
    border-radius: 9px;
    font-weight: 700;
    min-height: 42px;
}

.stButton > button:hover {
    background: #0369A1;
    color: white;
}

[data-testid="stFileUploader"] {
    background: #142238;
    border: 1px dashed #38BDF8;
    border-radius: 13px;
    padding: 15px;
}

[data-testid="stDataFrame"] {
    border: 1px solid #293E59;
    border-radius: 12px;
}

</style>
""", unsafe_allow_html=True)


# =====================================================
# 3. HERO
# =====================================================

st.markdown("""
<div class="upload-hero">
<div class="upload-tag">WATTWISE • DATA MANAGEMENT</div>
<div class="upload-heading">Factory Data Import Center</div>
<div class="upload-description">
Upload industrial machine energy and production records.
WattWise will validate the file, preview the data and
securely import valid records into the application database.
</div>
</div>
""", unsafe_allow_html=True)


# =====================================================
# 4. DATABASE INFORMATION
# =====================================================

total_records = get_record_count()

col1, col2, col3 = st.columns(3)

with col1:

    st.markdown(f"""
    <div class="info-card">
    <div class="metric-label">DATABASE RECORDS</div>
    <div class="metric-value">{total_records:,}</div>
    <div class="metric-label">Currently stored records</div>
    </div>
    """, unsafe_allow_html=True)

with col2:

    st.markdown("""
    <div class="info-card">
    <div class="metric-label">SUPPORTED FORMAT</div>
    <div class="metric-value">CSV</div>
    <div class="metric-label">Comma-separated values</div>
    </div>
    """, unsafe_allow_html=True)

with col3:

    st.markdown("""
    <div class="info-card">
    <div class="metric-label">VALIDATION</div>
    <div class="metric-value">16 Fields</div>
    <div class="metric-label">Required data fields</div>
    </div>
    """, unsafe_allow_html=True)


# =====================================================
# 5. CSV TEMPLATE
# =====================================================

st.markdown(
    '<div class="section-heading">📄 Step 1 – Download CSV Template</div>',
    unsafe_allow_html=True
)

template = pd.DataFrame({

    "timestamp": [
        "2026-11-27 09:00:00",
        "2026-11-27 09:30:00",
        "2026-11-27 10:00:00"
    ],

    "machine_id": [
        "M-01", "M-02", "M-03"
    ],

    "product_type": [
        "Product A", "Product B", "Product A"
    ],

    "energy_kwh": [
        20.0, 30.0, 5.0
    ],

    "units_produced": [
        10, 10, 0
    ],

    "good_units": [
        9, 10, 0
    ],

    "rejected_units": [
        1, 0, 0
    ],

    "machine_status": [
        "RUNNING", "RUNNING", "IDLE"
    ],

    "production_hours": [
        1.0, 1.0, 0.0
    ],

    "idle_hours": [
        0.0, 0.0, 1.0
    ],

    "changeover_hours": [
        0.0, 0.0, 0.0
    ],

    "running_kwh": [
        20.0, 30.0, 0.0
    ],

    "idle_kwh": [
        0.0, 0.0, 5.0
    ],

    "changeover_kwh": [
        0.0, 0.0, 0.0
    ],

    "electricity_rate": [
        8.0, 8.0, 8.0
    ]

})

template_bytes = template.to_csv(
    index=False
).encode("utf-8")

st.download_button(
    label="⬇ Download Factory CSV Template",
    data=template_bytes,
    file_name="wattwise_factory_template.csv",
    mime="text/csv",
    use_container_width=True
)

st.caption(
    "The downloaded file contains example records. "
    "Replace them with your own factory readings before uploading."
)


# =====================================================
# 6. FILE UPLOAD
# =====================================================

st.markdown(
    '<div class="section-heading">📤 Step 2 – Upload Factory Data</div>',
    unsafe_allow_html=True
)

uploaded_file = st.file_uploader(
    "Choose your factory CSV file",
    type=["csv"],
    help="Upload a CSV file using the WattWise template format."
)


# =====================================================
# 7. PROCESS AND VALIDATE CSV
# =====================================================

if uploaded_file is not None:

    try:

        uploaded_df = pd.read_csv(
            uploaded_file,
            encoding="utf-8-sig"
        )

        # Validate uploaded records
        is_valid, validated_df, errors, warnings = (
            validate_factory_csv(uploaded_df)
        )

        st.markdown(
            '<div class="section-heading">🔍 Step 3 – Data Validation</div>',
            unsafe_allow_html=True
        )

        # Show record information
        m1, m2, m3 = st.columns(3)

        with m1:

            st.metric(
                "Uploaded Records",
                len(uploaded_df)
            )

        with m2:

            st.metric(
                "Columns Found",
                len(uploaded_df.columns)
            )

        with m3:

            st.metric(
                "Validation Result",
                "PASSED" if is_valid else "FAILED"
            )

        # Show warnings
        for warning in warnings:

            st.warning(warning)

        # Show errors
        if errors:

            st.error("CSV validation failed.")

            for error in errors:

                st.write("❌", error)

            st.info(
                "Correct the CSV file and upload it again."
            )

        else:

            st.success(
                "All validation checks passed. "
                "Your factory data is ready for preview."
            )

            # =========================================
            # 8. PREVIEW DATA
            # =========================================

            st.markdown(
                '<div class="section-heading">📋 Step 4 – Data Preview</div>',
                unsafe_allow_html=True
            )

            st.dataframe(
                validated_df.head(20),
                use_container_width=True,
                hide_index=True
            )

            st.caption(
                f"Showing first {min(20, len(validated_df))} "
                f"of {len(validated_df)} uploaded records."
            )

            # Summary
            st.markdown("### Upload Summary")

            s1, s2, s3, s4 = st.columns(4)

            with s1:
                st.metric(
                    "Total Energy",
                    f"{validated_df['energy_kwh'].sum():,.2f} kWh"
                )

            with s2:
                st.metric(
                    "Total Production",
                    f"{validated_df['units_produced'].sum():,}"
                )

            with s3:
                st.metric(
                    "Good Units",
                    f"{validated_df['good_units'].sum():,}"
                )

            with s4:
                st.metric(
                    "Rejected Units",
                    f"{validated_df['rejected_units'].sum():,}"
                )

            # =========================================
            # 9. DUPLICATE CHECK AGAINST DATABASE
            # =========================================

            existing = pd.read_sql_query(
                """
                SELECT timestamp, machine_id
                FROM energy_records
                """,
                sqlite3.connect(DB_PATH)
            )

            existing_keys = set(
                zip(
                    existing["timestamp"].astype(str),
                    existing["machine_id"].astype(str)
                )
            )

            upload_keys = list(
                zip(
                    validated_df["timestamp"].astype(str),
                    validated_df["machine_id"].astype(str)
                )
            )

            duplicate_mask = [
                key in existing_keys
                for key in upload_keys
            ]

            duplicate_count = sum(duplicate_mask)

            new_df = validated_df.loc[
                [not duplicate for duplicate in duplicate_mask]
            ].copy()

            if duplicate_count:

                st.warning(
                    f"{duplicate_count} records already exist "
                    "in the database and will be skipped."
                )

            if new_df.empty:

                st.error(
                    "No new records available to import. "
                    "All uploaded records already exist."
                )

            else:

                # =====================================
                # 10. IMPORT CONFIRMATION
                # =====================================

                st.markdown(
                    '<div class="section-heading">'
                    '💾 Step 5 – Confirm Import'
                    '</div>',
                    unsafe_allow_html=True
                )

                st.info(
                    f"{len(new_df)} new records are ready "
                    "to be added to the WattWise database."
                )

                confirm = st.checkbox(
                    "I confirm that this factory data is correct "
                    "and I want to import it."
                )

                if st.button(
                    "🚀 Import Factory Data",
                    use_container_width=True,
                    disabled=not confirm
                ):

                    try:

                        db_columns = [
                            "timestamp",
                            "machine_id",
                            "product_type",
                            "energy_kwh",
                            "units_produced",
                            "good_units",
                            "rejected_units",
                            "machine_status",
                            "production_hours",
                            "idle_hours",
                            "changeover_hours",
                            "running_kwh",
                            "idle_kwh",
                            "changeover_kwh",
                            "electricity_rate",
                            "scenario_tag"
                        ]

                        # Open SQLite connection
                        conn = sqlite3.connect(DB_PATH)

                        try:

                            # Atomic transaction:
                            # Either all rows are inserted or none.
                            conn.execute("BEGIN IMMEDIATE")

                            new_df[db_columns].to_sql(
                                "energy_records",
                                conn,
                                if_exists="append",
                                index=False
                            )

                            conn.commit()

                        except Exception:

                            conn.rollback()

                            raise

                        finally:

                            conn.close()

                        st.success(
                            f"Successfully imported "
                            f"{len(new_df)} factory records!"
                        )

                        st.balloons()

                        st.metric(
                            "Updated Database Records",
                            get_record_count()
                        )

                        st.info(
                            "Your records are now stored in "
                            "WattWise. You can continue to "
                            "machine and production analysis."
                        )

                        st.session_state["last_factory_import"] = {
                            "filename": uploaded_file.name,
                            "imported": len(new_df),
                            "duplicates": duplicate_count
                        }

                    except Exception as error:

                        st.error(
                            f"Database import failed: {error}"
                        )

    except Exception as error:

        st.error(
            f"Unable to read CSV file: {error}"
        )

        st.info(
            "Please upload a valid UTF-8 CSV file."
        )


# =====================================================
# 11. FOOTER
# =====================================================

st.markdown("""
<hr>
<div style="text-align:center;color:#71869F;
font-size:11px;padding:20px;">
<b style="color:#38BDF8;">⚡ WATTWISE</b><br>
Factory Data Import & Validation Center<br>
Industrial Energy Intelligence • Production Analytics
</div>
""", unsafe_allow_html=True)
