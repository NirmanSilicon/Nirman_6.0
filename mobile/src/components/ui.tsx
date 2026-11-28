import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SVGGradient,
  Path,
  Stop,
  Rect,
} from "react-native-svg";
import { router } from "expo-router";
import { C, FONT } from "../theme";
import { useSession } from "../session";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const Icon = ({
  name,
  size = 22,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Feather name={ICON_MAP[name] ?? "circle"} size={size} color={color} />;
// One line-icon family across screens; keep route callers stable.
const ICON_MAP: Partial<Record<IconName, React.ComponentProps<typeof Feather>["name"]>> = {
 "add-outline":"plus", "log-out-outline":"log-out", "pulse-outline":"activity",
 "home-outline":"home", "pie-chart-outline":"pie-chart", "sparkles-outline":"sliders",
 "folder-open-outline":"folder", "cloud-upload-outline":"upload-cloud", "stats-chart-outline":"bar-chart-2",
 "calculator-outline":"credit-card", "calculator":"credit-card", "person-outline":"user", "options-outline":"settings",
 "help-circle-outline":"help-circle", "information-circle-outline":"info", "shield-checkmark":"shield",
 "shield-checkmark-outline":"shield", "lock-closed-outline":"lock", "document-text-outline":"file-text",
 "documents-outline":"copy", "wallet-outline":"briefcase", "calendar-outline":"calendar", "flask-outline":"activity",
 "arrow-forward":"arrow-right", "arrow-back":"arrow-left", "arrow-up-outline":"arrow-up", "arrow-down-outline":"arrow-down",
 "arrow-up":"arrow-up", "arrow-down":"arrow-down", "trending-up":"trending-up", "trending-up-outline":"trending-up",
 "chevron-forward":"chevron-right", "chevron-up":"chevron-up", "chevron-down":"chevron-down",
 "eye-outline":"eye", "eye-off-outline":"eye-off", "mail-outline":"mail", "server-outline":"server",
 "checkmark":"check", "close":"x", "trash-outline":"trash-2", "refresh-outline":"refresh-cw",
 "add-circle-outline":"plus-circle", "bar-chart-outline":"bar-chart-2", "alert-circle-outline":"alert-circle",
 "checkmark-circle-outline":"check-circle", "download-outline":"download", "share-outline":"share-2",
 "time-outline":"clock", "analytics-outline":"activity", "trending-down-outline":"trending-down",
};
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={u.label}>{children}</Text>;
}
export function Body({
  children,
  muted = true,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return <Text style={[u.body, !muted && { color: C.ink }]}>{children}</Text>;
}
export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={u.title}>{children}</Text>;
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[u.card, style]}>{children}</View>;
}
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View style={u.badge}>
      <Text style={u.badgeText}>{children}</Text>
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        u.button,
        secondary && u.secondary,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      {icon && <Icon name={icon} size={19} color={secondary ? C.ink : C.white} />}
      <Text style={[u.buttonText, secondary && { color: C.ink }]}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 9, flex: 1 }}>
      <Text style={u.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8794A5"
        style={u.input}
        {...props}
      />
    </View>
  );
}
export function Screen({
  children,
  title,
  subtitle,
  back = true,
  backTo = "/home",
  onBack,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  backTo?: "/home" | "/insights";
  onBack?: () => void;
}) {
  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace(backTo);
  };
  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={u.screen}>
      <AppHeader onHelp={() => router.push("/guide")} />
      {back && (
        <Pressable
          onPress={handleBack}
          style={[u.round, { marginLeft: 23, marginTop: 12, marginBottom: 2 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-back" />
        </Pressable>
      )}
      <ScrollView
        contentContainerStyle={u.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {title && (
          <View style={{ gap: 8, paddingBottom: 8 }}>
            <Title>{title}</Title>
            {subtitle && <Body>{subtitle}</Body>}
          </View>
        )}
        {children}
        <Text style={u.footnote}>UQUAL · Your financial story, in focus.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={u.between}>
      <Text style={u.section}>{title}</Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ paddingVertical: 12 }}
        >
          <Text style={u.link}>{action} ↗</Text>
        </Pressable>
      )}
    </View>
  );
}
export function Logo({compact=false}:{compact?:boolean}) {
  return <Image source={require("../../assets/brand/uqual-transparent.png")}
    accessibilityLabel="UQUAL. Know Your Credit. Grow Better."
    resizeMode="contain" style={{ width: compact ? 140 : 190, height: compact ? 45 : 64 }} />;
}
export function AppHeader({ onHelp, onProfile, initial }: { onHelp?: () => void; onProfile?: () => void; initial?: string }) {
  return <View style={u.appHeader}><Pressable onPress={onProfile} style={u.headerAvatar} accessibilityLabel="Profile"><Text style={u.headerInitial}>{initial ?? "U"}</Text></Pressable><Logo compact/><Pressable onPress={onHelp} style={u.headerHelp} accessibilityLabel="Help and score guide"><Icon name="help-circle-outline" size={23} color="#153E6C" /></Pressable></View>;
}
export function Art() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width="280" height="230" viewBox="0 0 280 230">
        <Defs>
          <SVGGradient id="card" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#C4E5FF" />
            <Stop offset=".5" stopColor="#5A9DE4" />
            <Stop offset="1" stopColor="#163D75" />
          </SVGGradient>
        </Defs>
        <Circle cx="140" cy="112" r="91" fill="#E7F2FB" />
        <Circle
          cx="140"
          cy="112"
          r="110"
          stroke="#D2E1EF"
          strokeDasharray="4 8"
          fill="none"
        />
        <Path
          d="M25 160Q140 210 250 55"
          stroke="#15976D"
          strokeWidth="2"
          fill="none"
        />
        <Rect
          x="62"
          y="50"
          width="160"
          height="114"
          rx="22"
          fill="url(#card)"
          transform="rotate(-14 140 110)"
        />
        <Path
          d="M83 128 114 108 138 116 180 78m-24 0h24v24"
          stroke="#FFFFFF"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="220" cy="173" r="26" fill="#D8F4E6" />
        <Path
          d="m208 173 9 8 15-17"
          fill="none"
          stroke="#087F5B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Circle cx="47" cy="67" r="7" fill="#31AA81" />
        <Circle cx="241" cy="45" r="4" fill="#3278DA" />
      </Svg>
    </View>
  );
}
function arc(a: number, b: number, r = 112) {
  const point = (angle: number) => [
    150 + r * Math.cos((angle * Math.PI) / 180),
    140 + r * Math.sin((angle * Math.PI) / 180),
  ];
  const s = point(a),
    e = point(b);
  return `M${s[0]},${s[1]} A${r},${r} 0 0 1 ${e[0]},${e[1]}`;
}
export function Gauge({ score }: { score: number | null }) {
  const colors = ["#EE8076", "#F2BB66", "#C2D970", "#24B58A"];
  const angle = 180 + (score ?? 0) * 1.8;
  return (
    <View
      accessible
      accessibilityLabel={
        score == null
          ? "No assessment yet"
          : `Synthetic demo index ${score.toFixed(2)} out of 100`
      }
      style={{
        height: 207,
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <Svg width="310" height="182" viewBox="0 0 300 175">
        {colors.map((color, i) => (
          <Path
            key={color}
            d={arc(182 + i * 45, 214 + i * 45)}
            stroke={color}
            strokeWidth="20"
            strokeLinecap="round"
            fill="none"
          />
        ))}
        {score != null && (
          <Circle
            cx={150 + 112 * Math.cos((angle * Math.PI) / 180)}
            cy={140 + 112 * Math.sin((angle * Math.PI) / 180)}
            r="8"
            fill={C.white}
            stroke={C.bg}
            strokeWidth="3"
          />
        )}
      </Svg>
      <View
        style={{ position: "absolute", top: 79, alignItems: "center", gap: 3 }}
      >
        <Text
          style={{
            fontFamily: FONT.heavy,
            fontSize: 55,
            lineHeight: 65,
            letterSpacing: -3,
            color: C.ink,
          }}
        >
          {score == null ? "—" : score.toFixed(0)}
        </Text>
        <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: C.muted }}>
          {score == null ? "Add your first statement" : "Synthetic demo index"}
        </Text>
      </View>
      <View
        style={{
          position: "absolute",
          top: 160,
          width: 270,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Label>0</Label>
        <Label>100</Label>
      </View>
    </View>
  );
}
export function GlobalStatus() {
  const { busy, error, setError } = useSession();
  return (
    <>
      {!!error && !busy && (
        <View accessibilityRole="alert" style={u.error}>
          <Text style={[u.body, { color: C.red, flex: 1 }]}>{error}</Text>
          <Pressable
            onPress={() => setError("")}
            style={u.round}
            accessibilityLabel="Dismiss message"
          >
            <Icon name="close" size={18} />
          </Pressable>
        </View>
      )}
      <Modal visible={!!busy} transparent animationType="none">
        <View style={u.loading}>
          <Card
            style={{
              width: "85%",
              maxWidth: 350,
              gap: 20,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={C.purple} />
            <Text style={[u.section, { textAlign: "center" }]}>{busy}</Text>
            <Body>Please keep the app open.</Body>
          </Card>
        </View>
      </Modal>
    </>
  );
}
export const u = StyleSheet.create({
  appHeader:{height:62,paddingHorizontal:20,backgroundColor:C.white,borderBottomWidth:1,borderColor:C.line,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},headerAvatar:{width:36,height:36,borderRadius:18,backgroundColor:"#E3F5FF",alignItems:"center",justifyContent:"center"},headerInitial:{fontFamily:FONT.heavy,fontSize:15,color:"#0078B1"},headerHelp:{width:40,height:40,alignItems:"center",justifyContent:"center"},
  screen: { flex: 1, backgroundColor: C.bg },
  content: {
    padding: 23,
    paddingTop: 17,
    gap: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 115,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: C.panel,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
    gap: 12,
  },
  title: {
    fontFamily: FONT.heavy,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.7,
    color: C.ink,
  },
  section: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.ink,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 22,
    color: C.muted,
  },
  label: {
    fontFamily: FONT.medium,
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: C.mint,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: FONT.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: C.lime,
  },
  button: {
    minHeight: 53,
    borderRadius: 17,
    backgroundColor: C.lavender,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 15,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },
  buttonText: { fontFamily: FONT.bold, fontSize: 14, color: C.white },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D9E2EC",
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 53,
    padding: 15,
    color: C.ink,
    fontFamily: FONT.medium,
    fontSize: 16,
  },
  fieldLabel: { fontFamily: FONT.medium, fontSize: 12, color: C.muted },
  round: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { fontFamily: FONT.medium, fontSize: 12, color: C.lime },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  footnote: {
    fontFamily: FONT.regular,
    color: "#748398",
    fontSize: 10,
    textAlign: "center",
    paddingTop: 12,
  },
  line: { height: 1, backgroundColor: C.line, marginVertical: 6 },
  error: {
    position: "absolute",
    bottom: 95,
    left: 20,
    right: 20,
    backgroundColor: "#FFF1F2",
    borderColor: "#F3CDD3",
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loading: {
    flex: 1,
    backgroundColor: "#09234866",
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    fontFamily: FONT.heavy,
    fontSize: 31,
    letterSpacing: -1,
    color: C.ink,
  },
  soft: { backgroundColor: "#EAF6F0", borderRadius: 23, padding: 20, gap: 12 },
});
