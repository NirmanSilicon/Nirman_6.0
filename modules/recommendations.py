
import pandas as pd


# --------------------------------------------------
# GENERATE RECOMMENDATIONS
# --------------------------------------------------

def generate_recommendation(row):

    waste_type = str(row.get("waste_type", ""))

    machine = str(row.get("machine_id", "Unknown"))

    if waste_type == "Idle Energy Waste":

        return (
            f"Reduce unnecessary idle operation of {machine}. "
            "Switch off equipment during extended idle periods "
            "where operationally safe. Introduce automatic "
            "standby controls."
        )

    elif waste_type == "Excess Energy Consumption":

        return (
            f"Inspect {machine} for inefficient operation. "
            "Check motor loading, equipment condition, "
            "maintenance schedules and operating parameters. "
            "Compare actual energy consumption against "
            "the production baseline."
        )

    elif waste_type == "Changeover Energy Waste":

        return (
            f"Optimize changeover scheduling on {machine}. "
            "Reduce setup time, prepare tools in advance and "
            "avoid unnecessary machine operation during "
            "changeovers."
        )

    elif waste_type == "High Product Rejection":

        return (
            f"Investigate quality issues on {machine}. "
            "Check raw materials, machine calibration, "
            "operator settings and quality-control procedures."
        )

    elif waste_type == "Abnormal Energy Usage":

        return (
            f"Investigate abnormal energy consumption on "
            f"{machine}. Inspect equipment, motor efficiency, "
            "load conditions and maintenance requirements."
        )

    return "Investigate machine operation and energy usage."


# --------------------------------------------------
# ADD RECOMMENDATIONS TO EVENTS
# --------------------------------------------------

def add_recommendations(events_df):

    if events_df is None or events_df.empty:

        return pd.DataFrame()

    result = events_df.copy()

    result["recommendation"] = result.apply(
        generate_recommendation,
        axis=1
    )

    return result


# --------------------------------------------------
# ESTIMATE POTENTIAL SAVINGS
# --------------------------------------------------

def calculate_potential_savings(events_df):

    if events_df is None or events_df.empty:

        return {
            "total_waste_kwh": 0.0,
            "total_waste_cost": 0.0,
            "potential_savings_kwh": 0.0,
            "potential_savings_rupees": 0.0,
            "critical_events": 0,
            "high_events": 0,
            "medium_events": 0,
            "low_events": 0
        }

    # Quality alerts have zero energy waste.
    total_waste_kwh = events_df["waste_kwh"].sum()

    total_waste_cost = events_df["waste_cost"].sum()

    # Conservative illustrative recovery assumptions.
    recovery_rates = {
        "Idle Energy Waste": 0.60,
        "Excess Energy Consumption": 0.50,
        "Changeover Energy Waste": 0.40,
        "Abnormal Energy Usage": 0.50,
        "High Product Rejection": 0.0
    }

    result = events_df.copy()

    result["recovery_rate"] = (
        result["waste_type"]
        .map(recovery_rates)
        .fillna(0)
    )

    result["potential_savings_kwh"] = (
        result["waste_kwh"]
        * result["recovery_rate"]
    )

    result["potential_savings_rupees"] = (
        result["waste_cost"]
        * result["recovery_rate"]
    )

    severity_counts = (
        result["severity"]
        .value_counts()
        .to_dict()
    )

    return {
        "total_waste_kwh": round(
            float(total_waste_kwh), 2
        ),

        "total_waste_cost": round(
            float(total_waste_cost), 2
        ),

        "potential_savings_kwh": round(
            float(result["potential_savings_kwh"].sum()), 2
        ),

        "potential_savings_rupees": round(
            float(result["potential_savings_rupees"].sum()), 2
        ),

        "critical_events": severity_counts.get("Critical", 0),

        "high_events": severity_counts.get("High", 0),

        "medium_events": severity_counts.get("Medium", 0),

        "low_events": severity_counts.get("Low", 0)
    }


# --------------------------------------------------
# MACHINE-WISE WASTE SUMMARY
# --------------------------------------------------

def machine_waste_summary(events_df):

    if events_df is None or events_df.empty:

        return pd.DataFrame()

    return (
        events_df
        .groupby("machine_id", as_index=False)
        .agg(
            total_waste_kwh=("waste_kwh", "sum"),
            total_waste_cost=("waste_cost", "sum"),
            waste_events=("waste_type", "count")
        )
        .sort_values(
            "total_waste_cost",
            ascending=False
        )
    )


# --------------------------------------------------
# WASTE-TYPE SUMMARY
# --------------------------------------------------

def waste_type_summary(events_df):

    if events_df is None or events_df.empty:

        return pd.DataFrame()

    return (
        events_df
        .groupby("waste_type", as_index=False)
        .agg(
            total_waste_kwh=("waste_kwh", "sum"),
            total_waste_cost=("waste_cost", "sum"),
            event_count=("waste_type", "count")
        )
        .sort_values(
            "total_waste_cost",
            ascending=False
        )
    )
