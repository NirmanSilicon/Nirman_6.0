AEROSENTRY Test Connection Button Fix

This patch replaces:
  components/settings/settings.js
  style.css

How to apply:
1. Close the AEROSENTRY dashboard browser tab.
2. Extract this ZIP directly into your project root folder:
   D:\silicon\folder 24\AEROSENTRY_Phase3_Phase4_DS05
3. Allow Windows to overwrite the two existing files.
4. Restart the FastAPI backend if it is running.
5. Re-open the dashboard with Live Server.
6. Press Ctrl+F5 to hard-refresh the browser.
7. Click Test connection once. The label should change to Testing... briefly,
   then return to Test connection with a success/error message. The health
   check has an 8-second timeout and restores the button in a finally block.

This patch does not include or modify the NASA HDF5 dataset.
