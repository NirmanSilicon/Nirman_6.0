
import pandas as pd

# Phase 4 imports
from modules.energy_analysis import (
    load_energy_data,
    run_complete_analysis
)

# Phase 5 imports
from modules.detection import (
    detect_waste,
    save_waste_events,
    get_waste_events
)

from modules.recommendations import (
    add_recommendations,
    calculate_potential_savings,
    machine_waste_summary,
    waste_type_summary
)


# ==================================================
# RUN COMPLETE WASTE DETECTION SYSTEM
# ==================================================

def run_waste_engine(save_to_database=True):

    # STEP 1: LOAD FACTORY RECORDS FROM SQLITE

    raw_df = load_energy_data()

    if raw_df is None:
        raw_df = pd.DataFrame()

    # STEP 2: RUN PHASE 4 ENERGY ANALYSIS

    analyzed_df, machine_df, product_df = (
        run_complete_analysis(raw_df)
    )

    # STEP 3: DETECT ENERGY WASTE

    events_df = detect_waste(analyzed_df)

    # STEP 4: GENERATE RECOMMENDATIONS

    events_df = add_recommendations(events_df)

    # STEP 5: SAVE EVENTS INTO DATABASE

    saved_count = 0

    if (
        save_to_database
        and events_df is not None
        and not events_df.empty
    ):

        saved_count = save_waste_events(events_df)

    # STEP 6: CALCULATE POTENTIAL SAVINGS

    savings = calculate_potential_savings(events_df)

    # STEP 7: MACHINE-WISE WASTE SUMMARY

    machine_summary = machine_waste_summary(events_df)

    # STEP 8: WASTE CATEGORY SUMMARY

    category_summary = waste_type_summary(events_df)

    # STEP 9: RETURN ALL RESULTS

    return {

        "raw_df": raw_df,

        "analyzed_df": analyzed_df,

        "machine_df": machine_df,

        "product_df": product_df,

        "events_df": events_df,

        "savings": savings,

        "machine_summary": machine_summary,

        "category_summary": category_summary,

        "saved_count": saved_count

    }
