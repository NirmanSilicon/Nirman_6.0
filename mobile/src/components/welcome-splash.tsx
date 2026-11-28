import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "./ui";
import { FONT } from "../theme";

export function WelcomeSplash({ onContinue }: { onContinue: () => void }) {
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, damping: 18, stiffness: 130, mass: 0.8, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 520, useNativeDriver: true }).start(() => onContinue()), 3000);
    return () => clearTimeout(timer);
  }, [lift, opacity, onContinue]);
  const compact = height < 740;
  return (
    <SafeAreaView edges={["top", "bottom"]} style={s.page}>
      <View style={s.background} pointerEvents="none">
        <View style={[s.corner, s.cornerTop, { width: width * 0.62, height: width * 0.52 }]} />
        <View style={[s.corner, s.cornerBottom, { width: width * 0.64, height: width * 0.52 }]} />
        <View style={s.bottomWash} />
      </View>
      <View style={s.content}>
        <View style={s.topBar}>
          <Text style={s.secure}>UQUAL</Text>
        </View>
        <Animated.View style={[s.brandBlock, { opacity, transform: [{ translateY: lift }] }]}>
          <Image source={require("../../assets/brand/uqual-transparent.png")} resizeMode="contain" style={[s.logo, compact && s.logoCompact]} accessibilityLabel="UQUAL logo" />
          <Text style={s.tagline}>Know Your Credit. Grow Better.</Text>
        </Animated.View>
        <View style={s.spacer} />
        <Animated.View style={[s.trustBlock, { opacity, transform: [{ translateY: lift }] }]}>
          <Text style={s.trustTitle}>TRUSTED FOR SMARTER CREDIT ACCESS</Text>
          <View style={s.trustRow}>
            <TrustItem icon="shield-checkmark-outline" title={"Bank-Grade\nSecurity"} />
            <View style={s.divider} />
            <TrustItem icon="lock-closed-outline" title={"Your Data\nYour Control"} />
            <View style={s.divider} />
            <TrustItem icon="star-outline" title={"Privacy\nFirst"} />
          </View>
        </Animated.View>
        <Image source={require("../../assets/welcome/india-skyline.png")} resizeMode="contain" style={s.skyline} accessibilityLabel="Indian city skyline" />
      </View>
    </SafeAreaView>
  );
}

function TrustItem({ icon, title }: { icon: "shield-checkmark-outline" | "lock-closed-outline" | "star-outline"; title: string }) {
  return <View style={s.trustItem}><Icon name={icon} size={30} color="#4C6171" /><Text style={s.trustText}>{title}</Text></View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  background: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  corner: { position: "absolute", opacity: 0.55, borderRadius: 180 },
  cornerTop: { top: -95, left: -85, backgroundColor: "#BEEFEB", transform: [{ rotate: "-28deg" }] },
  cornerBottom: { right: -100, bottom: 60, backgroundColor: "#C8F5E4", transform: [{ rotate: "-28deg" }] },
  bottomWash: { position: "absolute", bottom: 0, left: 0, right: 0, height: 140, backgroundColor: "#F5F2FF", opacity: 0.55 },
  content: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 26 },
  topBar: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  secure: { fontFamily: FONT.heavy, fontSize: 12, letterSpacing: 2.5, color: "#163F76" },
  login: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 },
  loginText: { fontFamily: FONT.bold, fontSize: 14, color: "#123044" },
  brandBlock: { alignItems: "center", marginTop: 56 },
  logo: { width: "92%", height: 116 }, logoCompact: { height: 92 },
  tagline: { fontFamily: FONT.medium, fontSize: 12, letterSpacing: 0.4, color: "#34567D", marginTop: -5 },
  spacer: { flex: 1, minHeight: 34 },
  trustBlock: { alignItems: "center", paddingBottom: 10 },
  trustTitle: { fontFamily: FONT.bold, fontSize: 13, letterSpacing: 0.7, color: "#40586A", textAlign: "center", marginBottom: 18 },
  trustRow: { width: "100%", flexDirection: "row", alignItems: "stretch", justifyContent: "space-around" },
  trustItem: { flex: 1, alignItems: "center", justifyContent: "flex-start", gap: 8 },
  trustText: { fontFamily: FONT.bold, fontSize: 12, lineHeight: 16, color: "#52697B", textAlign: "center" },
  divider: { width: 1, backgroundColor: "#CAD3DC", marginVertical: 4 },
  skyline: { width: "125%", height: 100, alignSelf: "center", marginBottom: -2, opacity: 0.82 },
  continue: { alignSelf: "center", minHeight: 49, borderRadius: 25, paddingHorizontal: 25, marginBottom: 10, backgroundColor: "#123044", flexDirection: "row", alignItems: "center", gap: 12 }, continueText: { fontFamily: FONT.bold, fontSize: 13, color: "#FFFFFF" }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
