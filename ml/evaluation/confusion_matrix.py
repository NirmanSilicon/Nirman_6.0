from sklearn.metrics import confusion_matrix, classification_report


def get_confusion_matrix(
    y_true,
    y_pred,
    labels=None,
):
    """Return confusion matrix and classification report."""

    return {
        "matrix": confusion_matrix(
            y_true,
            y_pred,
            labels=labels,
        ),
        "report": classification_report(
            y_true,
            y_pred,
            labels=labels,
            output_dict=True,
            zero_division=0,
        ),
    }