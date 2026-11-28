# Re-apply ADB reverse port forwarding for USB-connected Android device
adb devices
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
adb reverse --list
