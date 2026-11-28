import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "./ui";
import { FONT } from "../theme";

export function WelcomeFeatures({ onCreate, onLogin, onBack }: { onCreate: () => void; onLogin: () => void; onBack: () => void }) {
  return <SafeAreaView edges={["top", "bottom"]} style={s.page}>
    <View style={s.corner} /><View style={s.cornerTwo} />
    <View style={s.body}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" onPress={onBack} style={{ alignSelf: "flex-start", minWidth: 44, minHeight: 44, justifyContent: "center" }}><Icon name="arrow-back" /></Pressable>
      <Image source={require("../../assets/brand/uqual-transparent.png")} resizeMode="contain" style={s.logo} accessibilityLabel="UQUAL logo" />
      <Text style={s.title}>Analyse Your Finances,</Text><Text style={s.title}>Build Your Credit Identity</Text>
      <View style={s.features}>
        <Feature icon="analytics-outline" label={"Financial\nBehaviour Index"} /><Feature icon="document-text-outline" label={"Explainable\nCredit Profile"} /><Feature icon="compass-outline" label={"Credit\nImprovement Coach"} /><Feature icon="shield-checkmark-outline" label={"Portable Financial\nPassport"} />
      </View>
      <View style={s.dots}><View style={s.active} /><View style={s.dot} /><View style={s.dot} /></View>
      <View style={s.spacer} />
      <Pressable onPress={onCreate} style={({ pressed }) => [s.primary, pressed && s.pressed]}><Text style={s.primaryText}>Create Account</Text><Icon name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>
      <Pressable onPress={onLogin} style={({ pressed }) => [s.secondary, pressed && s.pressed]}><Text style={s.secondaryText}>Log in</Text></Pressable>
      <Image source={require("../../assets/welcome/india-skyline.png")} resizeMode="contain" style={s.skyline} />
    </View>
  </SafeAreaView>;
}
function Feature({ icon, label }: { icon: "analytics-outline" | "document-text-outline" | "compass-outline" | "shield-checkmark-outline"; label: string }) { return <View style={s.feature}><View style={s.icon}><Icon name={icon} size={23} color="#168E73" /></View><Text style={s.label}>{label}</Text></View>; }
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#FFF"},body:{flex:1,paddingHorizontal:28,alignItems:"center",paddingTop:55},corner:{position:"absolute",top:-70,left:-55,width:220,height:180,borderRadius:120,backgroundColor:"#D8F4F2",transform:[{rotate:"-25deg"}]},cornerTwo:{position:"absolute",bottom:80,right:-90,width:230,height:190,borderRadius:120,backgroundColor:"#DDF8ED",transform:[{rotate:"-25deg"}]},logo:{width:"86%",height:92,marginBottom:54},title:{fontFamily:FONT.heavy,fontSize:22,lineHeight:28,color:"#142A56",textAlign:"center"},features:{width:"100%",flexDirection:"row",marginTop:58,gap:5},feature:{flex:1,alignItems:"center",gap:8},icon:{width:50,height:50,borderRadius:16,backgroundColor:"#E9FAF3",alignItems:"center",justifyContent:"center"},label:{fontFamily:FONT.bold,fontSize:9,lineHeight:12,color:"#213855",textAlign:"center"},dots:{flexDirection:"row",gap:8,marginTop:25},active:{width:10,height:10,borderRadius:5,backgroundColor:"#214BC5"},dot:{width:10,height:10,borderRadius:5,backgroundColor:"#D7DCE8"},spacer:{flex:1,minHeight:28},primary:{width:"100%",minHeight:56,borderRadius:28,backgroundColor:"#214BC5",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:12},primaryText:{fontFamily:FONT.bold,fontSize:15,color:"#FFF"},secondary:{width:"100%",minHeight:56,borderRadius:28,borderWidth:1.2,borderColor:"#173A82",alignItems:"center",justifyContent:"center",marginTop:11},secondaryText:{fontFamily:FONT.bold,fontSize:15,color:"#142A56"},skyline:{width:"128%",height:95,marginTop:14,marginBottom:-4,opacity:.8},pressed:{opacity:.82,transform:[{scale:.98}]}});
