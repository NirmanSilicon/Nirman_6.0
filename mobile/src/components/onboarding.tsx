import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Icon, Logo } from "./ui";
import { Touch } from "./motion";
import { FONT } from "../theme";
const slides = [
  { kicker: "01 / UNDERSTAND YOUR MONEY", title: "Your money,", accent: "made clear.", body: "Turn your bank statement into a clearer picture of what comes in, goes out and stays with you.", image: require("../../assets/onboarding/cashflow-illustration.png"), background: "#FFFFFF", accentColor: "#087B60", chips: ["Cashflow insights", "Spending patterns"], cta: "Explore UQUAL", alt: "Illustration of a woman exploring her statement and cashflow" },
  { kicker: "02 / ALWAYS YOURS", title: "Your story.", accent: "Your control.", body: "A private home for your statements. Choose what you share, and delete your data whenever you need.", image: require("../../assets/onboarding/vault-illustration.png"), background: "#F4F5FC", accentColor: "#4C57A8", chips: ["Upload by choice", "Delete anytime"], cta: "See what’s next", alt: "Illustration of a safe protecting bank statements" },
  { kicker: "03 / LOOK AHEAD", title: "A little clarity.", accent: "A better next step.", body: "Explore how an EMI could fit your cashflow. Plan with a clearer view of your everyday finances.", image: require("../../assets/onboarding/planning-illustration.png"), background: "#F8F7F1", accentColor: "#087B60", chips: ["EMI scenarios", "Thoughtful planning"], cta: "Get started", alt: "Illustration of a person taking steps toward their financial goals" },
];
export function Onboarding({ onFinish, onLogin }: { onFinish: () => void; onLogin: () => void }) {
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const slide = slides[step];
  const small = height < 740;
  const fontSize = Math.min(width < 360 ? 32 : 38, small ? 33 : 38);
  const first = step === 0;
  const artwork = <View style={[s.artwork, { minHeight: small ? 205 : 260 }]}><Image source={slide.image} resizeMode="contain" style={s.image} accessibilityLabel={slide.alt}/></View>;
  const copy = <View style={[s.copy, step === 1 && s.centerCopy]}><Text style={[s.title, { fontSize, lineHeight: fontSize + 6 }, step === 1 && s.centerText]}>{slide.title}{"\n"}<Text style={{color:slide.accentColor}}>{slide.accent}</Text></Text><Text style={[s.body,step===1&&s.centerText]}>{slide.body}</Text></View>;
  return <SafeAreaView edges={["top","bottom","left","right"]} style={[s.page,{backgroundColor:slide.background}]}><View style={s.frame}>
    <View style={s.header}><Logo compact/><Touch onPress={onLogin} accessibilityLabel="Log in to UQUAL" style={s.login}><Text style={s.loginText}>Log in</Text><Icon name="arrow-forward" size={16} color="#172D36"/></Touch></View>
    <ScrollView key={step} style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={reduced?FadeIn.duration(120):FadeInDown.duration(260)} style={[s.scene,first&&{paddingBottom:0,minHeight:height-110}]}>
        <Text style={[s.kicker,{color:slide.accentColor}]}>{slide.kicker}</Text>
        {first?<><View pointerEvents="none" style={s.sun}/><Text accessibilityRole="header" style={[s.editorialTitle,{fontSize:width<360?40:46,lineHeight:width<360?44:50}]}>Your money.{"\n"}A clearer{"\n"}picture.</Text><Text style={[s.body,{marginTop:17}]}>See the patterns in your bank statement. Understand your cashflow, even before your first loan.</Text><View style={s.handStage}><View style={s.purpleShape}/><View style={s.limeShape}/><Image source={require("../../assets/onboarding/statement-hand.png")} resizeMode="contain" style={s.hand} accessibilityLabel="A hand holding a statement card with a financial chart"/></View></>:step===1?<>{artwork}{copy}</>:<>{copy}{artwork}</>}
        {!first&&<View style={s.chips}>{slide.chips.map(label=><View key={label} style={s.chip}><Icon name="checkmark" size={13} color={slide.accentColor}/><Text style={s.chipText}>{label}</Text></View>)}</View>}
      </Animated.View>
    </ScrollView>
    {first&&<View pointerEvents="none" style={s.rail}/>}<View style={[s.footer,first&&s.editorialFooter]}><View style={[s.progress,first&&{flex:1,marginRight:20}]}>{slides.map((_,i)=><Touch key={i} onPress={()=>setStep(i)} accessibilityLabel={`Introduction step ${i+1}`} accessibilityState={{selected:step===i}} style={s.dotTarget}><View style={[s.dot,i===step&&{width:25,backgroundColor:slide.accentColor}]}/></Touch>)}<Text style={s.counter}>0{step+1} / 03</Text></View>
    <Touch onPress={()=>step===2?onFinish():setStep(step+1)} accessibilityLabel={slide.cta} style={[s.next,first&&s.roundNext]}>{!first&&<Text style={s.nextText}>{slide.cta}</Text>}<Icon name="arrow-forward" size={first?28:21} color={first?"#ECFF86":"#FFFFFF"}/></Touch>
    <Text style={[s.disclosure,first&&s.editorialDisclosure]}>Cashflow insights & synthetic demo index. Not a bureau score.</Text></View>
  </View></SafeAreaView>;
}
const s=StyleSheet.create({
 sun:{position:"absolute",right:28,top:48,width:165,height:165,borderRadius:90,backgroundColor:"#ECFF86"},editorialTitle:{fontFamily:FONT.heavy,color:"#111711",letterSpacing:-1.8},handStage:{flexGrow:1,minHeight:300,marginTop:14,overflow:"hidden"},hand:{position:"absolute",width:"118%",height:"112%",bottom:-35,left:"-16%"},purpleShape:{position:"absolute",bottom:-15,left:0,width:33,height:95,borderRadius:25,backgroundColor:"#4C3CDB",transform:[{rotate:"-25deg"}]},limeShape:{position:"absolute",bottom:130,right:4,width:42,height:80,borderTopLeftRadius:80,borderBottomLeftRadius:80,backgroundColor:"#ECFF86"},rail:{position:"absolute",top:68,right:0,bottom:69,width:12,borderTopLeftRadius:20,backgroundColor:"#111711"},editorialFooter:{position:"absolute",bottom:32,left:0,right:0,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingRight:12},roundNext:{width:70,height:70,minHeight:70,borderRadius:35,paddingHorizontal:0,justifyContent:"center",backgroundColor:"#111711"},editorialDisclosure:{position:"absolute",bottom:-25,left:20,right:20,marginTop:0,fontSize:8},

 page:{flex:1},frame:{flex:1,width:"100%",maxWidth:520,alignSelf:"center"},header:{paddingHorizontal:25,paddingTop:8,paddingBottom:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},login:{minHeight:44,flexDirection:"row",alignItems:"center",gap:8},loginText:{fontFamily:FONT.bold,fontSize:13,color:"#172D36"},scroll:{flex:1},scrollContent:{flexGrow:1},scene:{flexGrow:1,paddingHorizontal:26,paddingTop:13,paddingBottom:8},kicker:{fontFamily:FONT.bold,fontSize:10,letterSpacing:1.3,marginBottom:18},copy:{gap:15},centerCopy:{alignItems:"center"},centerText:{textAlign:"center"},title:{fontFamily:FONT.bold,color:"#122D39",letterSpacing:-1.4},body:{fontFamily:FONT.regular,fontSize:14,lineHeight:22,color:"#5C6E73",maxWidth:390},artwork:{flexGrow:1,flexShrink:0,marginHorizontal:-14,marginVertical:8},image:{position:"absolute",width:"100%",height:"100%"},chips:{flexDirection:"row",justifyContent:"center",gap:8,flexWrap:"wrap",paddingVertical:10},chip:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:10,paddingVertical:8,borderRadius:20,backgroundColor:"#FFFFFFC9"},chipText:{fontFamily:FONT.medium,fontSize:10,color:"#415B60"},footer:{paddingHorizontal:26,paddingBottom:8,paddingTop:4},progress:{flexDirection:"row",alignItems:"center",marginBottom:7},dotTarget:{minWidth:35,minHeight:36,justifyContent:"center"},dot:{width:7,height:6,borderRadius:4,backgroundColor:"#CFD8D8"},counter:{marginLeft:"auto",fontFamily:FONT.medium,fontSize:10,color:"#7E8E91",letterSpacing:1},next:{minHeight:56,borderRadius:18,backgroundColor:"#102E3A",flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:22},nextText:{fontFamily:FONT.bold,fontSize:15,color:"#FFFFFF"},disclosure:{fontFamily:FONT.regular,fontSize:9,lineHeight:14,color:"#7F8E90",textAlign:"center",marginTop:13}
});
