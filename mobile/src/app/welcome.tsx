import React, { useEffect, useState, useRef } from "react";
import { BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, Logo, type IconName } from "../components/ui";
import { WelcomeSplash } from "../components/welcome-splash";
import { WelcomeFeatures } from "../components/welcome-features";
import { C, FONT } from "../theme";
import { DEFAULT_URL, useSession } from "../session";
type Mode="intro"|"features"|"login"|"register";
function AuthField({icon,label,trailing,...props}:TextInputProps&{icon:IconName;label:string;trailing?:React.ReactNode}) {
  const [focused,setFocused]=useState(false);
  return <View style={{gap:7}}><Text style={s.fieldLabel}>{label}</Text><View style={[s.inputWrap,focused&&{borderColor:"#078568",backgroundColor:"#FFFFFF"}]}><Icon name={icon} size={20} color="#80928E"/><TextInput {...props} onFocus={event=>{setFocused(true);props.onFocus?.(event);}} onBlur={event=>{setFocused(false);props.onBlur?.(event);}} accessibilityLabel={label} placeholderTextColor="#95A29F" style={s.input}/>{trailing}</View></View>;
}
export default function Welcome() {
  const state=useSession();
  const { session: currentSession, setError: setGlobalError } = state;
  const scrollRef=useRef<ScrollView>(null);
  const [mode,setMode]=useState<Mode>("intro");
  const [url,setUrl]=useState(DEFAULT_URL),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[confirm,setConfirm]=useState(""),[accepted,setAccepted]=useState(false),[configure,setConfigure]=useState(false),[visible,setVisible]=useState(false);
  function change(next:Mode){setMode(next);setPassword("");setConfirm("");setVisible(false);state.setError("");scrollRef.current?.scrollTo({y:0,animated:false});}
  useEffect(() => {
    if (Platform.OS !== "android" || currentSession) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (mode === "login" || mode === "register") {
        setMode("intro");
        setPassword("");
        setConfirm("");
        setVisible(false);
        setGlobalError("");
      }
      else if (mode === "features") setMode("intro");
      return true;
    });
    return () => subscription.remove();
  }, [mode, currentSession, setGlobalError]);
  if(state.session)return <Redirect href="/home"/>;
  function submit(){state.perform(mode==="login"?"Signing you in":"Creating your private account",async()=>{
    if(!email.trim())throw new Error("Enter your email address.");
    if(password.length<12||password.length>128)throw new Error("Use a password with 12–128 characters.");
    if(mode==="register"&&!name.trim())throw new Error("Enter your name.");
    if(mode==="register"&&password!==confirm)throw new Error("Your passwords do not match.");
    await state.authenticate(mode as "login"|"register",url,email,password,name,accepted);setPassword("");setConfirm("");
  });}
  const primary=(title:string,onPress:()=>void,disabled=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.primary,disabled&&{opacity:0.45},pressed&&{opacity:0.85,transform:[{scale:0.98}]}]}><Text style={s.primaryText}>{title}</Text><Icon name="arrow-forward" color="#FFFFFF" size={18}/></Pressable>;
  if(mode==="intro")return <WelcomeSplash onContinue={()=>setMode("features")}/>;
  if(mode==="features")return <WelcomeFeatures onBack={()=>setMode("intro")} onCreate={()=>change("register")} onLogin={()=>change("login")}/>;
  return <View style={s.page}><LinearGradient colors={["#F5FAF7","#EDF5EF","#F5FAF7"]} style={StyleSheet.absoluteFill}/><SafeAreaView edges={["top","left","right"]} style={{flex:1}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}><ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <View style={[s.hero,s.heroCompact]}>
      <View style={s.heroTop}><Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" onPress={()=>change("features")} style={s.back}><Icon name="arrow-back" color="#172619"/></Pressable><Logo compact/></View>
      <View style={s.heroContent}><View style={{flex:1,gap:9}}><Text style={s.heroEyebrow}>{mode==="login"?"YOUR PERSONAL MONEY SPACE":"A CLEARER FINANCIAL FUTURE"}</Text><Text style={s.heroHeading}>{mode==="login"?"Good to have\nyou back.":"Start with\na little clarity."}</Text></View><Image source={require("../../assets/onboarding/vault-illustration.png")} style={s.authArt} resizeMode="contain" accessibilityIgnoresInvertColors accessibilityLabel="Illustration of your private statement vault"/></View>
    </View>
    <View style={s.sheet}>
        <View style={s.formHeading}><Text style={s.formTitle}>{mode==="login"?"Welcome back":"Create your account"}</Text><Text style={s.description}>{mode==="login"?"Log in to your personal cashflow space.":"A fresh start for your financial story."}</Text></View>
        {mode==="register"&&<AuthField icon="person-outline" label="Your name" placeholder="Enter your full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name"/>}
        <AuthField icon="mail-outline" label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"/>
        <AuthField icon="lock-closed-outline" label="Password" placeholder={mode==="register"?"Create a strong password":"Enter your password"} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete={mode==="login"?"current-password":"new-password"} trailing={<Pressable accessibilityRole="button" accessibilityLabel={visible?"Hide password":"Show password"} onPress={()=>setVisible(!visible)} style={s.eye}><Icon name={visible?"eye-off-outline":"eye-outline"} size={20} color="#80928E"/></Pressable>}/>
        {mode==="register"&&<Text style={s.hint}>Use 12–128 characters.</Text>}
        {mode==="register"&&<AuthField icon="lock-closed-outline" label="Confirm password" placeholder="Enter your password again" value={confirm} onChangeText={setConfirm} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password"/>}
        {mode==="register"&&<Pressable accessibilityRole="checkbox" accessibilityState={{checked:accepted}} onPress={()=>setAccepted(!accepted)} style={s.consent}><View style={[s.checkbox,accepted&&{backgroundColor:"#138E8D",borderColor:"#138E8D"}]}>{accepted&&<Icon name="checkmark" size={15} color="#FFFFFF"/>}</View><Text style={s.consentText}>I agree to account storage. Statements are uploaded only with separate consent, and I can delete my data.</Text></Pressable>}
        {primary(state.busy?"Please wait…":mode==="login"?"Log in":"Create account",submit,!!state.busy||(mode==="register"&&!accepted))}
        <Pressable accessibilityRole="button" onPress={()=>change(mode==="login"?"register":"login")} style={s.switchButton}><Text style={s.switchText}>{mode==="login"?"New to UQUAL? ":"Already have an account? "}<Text style={s.link}>{mode==="login"?"Sign up":"Log in"}</Text></Text></Pressable>
        <View style={s.security}><Icon name="shield-checkmark-outline" size={17} color="#138E8D"/><Text style={s.securityText}>No PAN or bank password required</Text></View>
        <Text style={s.finePrint}>Email verification and password recovery are not available yet. Keep your password safe.</Text>
        <Pressable accessibilityRole="button" onPress={()=>setConfigure(!configure)} style={s.configure}><Text style={s.configureText}>Server settings</Text><Icon name={configure?"chevron-up":"chevron-down"} color="#85968F" size={14}/></Pressable>
        {configure&&<AuthField icon="server-outline" label="Server URL" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url"/>}
      <Text style={s.footer}>Know Your Credit. Grow Better.</Text>
    </View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView></View>;
}
const s=StyleSheet.create({
  page:{flex:1,backgroundColor:"#F5FAF7"},scroll:{flexGrow:1,width:"100%",maxWidth:560,alignSelf:"center"},
  hero:{paddingTop:14,paddingHorizontal:24,paddingBottom:5,minHeight:325,justifyContent:"space-between",overflow:"hidden"},heroCompact:{minHeight:210,paddingBottom:20},heroContent:{flexDirection:"row",alignItems:"center",gap:10,marginTop:20},heroEyebrow:{fontFamily:FONT.bold,fontSize:8,letterSpacing:1.1,color:"#497767"},authArt:{width:115,height:115,borderRadius:22},heroTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},trust:{flexDirection:"row",gap:7,alignItems:"center"},trustText:{fontFamily:FONT.bold,fontSize:9,color:"#DAFFFA",letterSpacing:1},smallPill:{backgroundColor:"#FFFFFF22",paddingVertical:7,paddingHorizontal:12,borderRadius:20},smallPillText:{fontFamily:FONT.heavy,fontSize:11,color:"#172619",letterSpacing:1},
  back:{width:38,height:38,borderRadius:19,backgroundColor:"#17261910",alignItems:"center",justifyContent:"center"},heroHeading:{fontFamily:FONT.bold,fontSize:27,lineHeight:33,color:"#172D36",letterSpacing:-0.8,marginTop:0,zIndex:1},compactArt:{width:205,alignSelf:"flex-end",marginTop:-37,opacity:0.75},
  sheet:{flexGrow:1,backgroundColor:"#FFFFFF",borderTopLeftRadius:28,borderTopRightRadius:28,padding:25,paddingBottom:32,gap:16},introSheet:{paddingTop:18},introTitle:{fontFamily:FONT.heavy,fontSize:27,lineHeight:35,color:C.ink,textAlign:"center",letterSpacing:-1},description:{fontFamily:FONT.regular,fontSize:13,lineHeight:21,color:"#60736C",textAlign:"left"},
  chips:{flexDirection:"row",justifyContent:"center",gap:10,flexWrap:"wrap"},chip:{flexDirection:"row",alignItems:"center",gap:5,backgroundColor:"#EFF8F5",paddingHorizontal:10,paddingVertical:8,borderRadius:10},chipText:{fontFamily:FONT.medium,fontSize:10,color:"#468077"},
  primary:{minHeight:55,borderRadius:16,backgroundColor:"#102E3A",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:12,paddingHorizontal:18,marginTop:3},primaryText:{fontFamily:FONT.bold,fontSize:14,color:"#FFFFFF"},switchButton:{minHeight:40,justifyContent:"center",alignItems:"center"},switchText:{fontFamily:FONT.regular,fontSize:12,color:"#7A8C86",textAlign:"center"},link:{fontFamily:FONT.bold,color:"#07838B"},
  formHeading:{alignItems:"flex-start",gap:7,marginBottom:10},formTitle:{fontFamily:FONT.heavy,fontSize:26,letterSpacing:-0.5,color:C.ink},fieldLabel:{fontFamily:FONT.medium,fontSize:12,color:"#4E665D",paddingLeft:4},inputWrap:{flexDirection:"row",alignItems:"center",minHeight:56,paddingLeft:18,paddingRight:8,gap:11,borderRadius:14,backgroundColor:"#F6F8F7",borderWidth:1,borderColor:"#DCE5E0"},input:{flex:1,minWidth:0,minHeight:54,color:C.ink,fontFamily:FONT.medium,fontSize:16,paddingVertical:12},eye:{minWidth:42,minHeight:44,alignItems:"center",justifyContent:"center"},hint:{fontFamily:FONT.regular,fontSize:11,color:"#62796D",marginTop:-9,paddingLeft:5},
  consent:{flexDirection:"row",gap:10,alignItems:"flex-start",paddingVertical:3},checkbox:{width:21,height:21,borderRadius:5,borderWidth:1,borderColor:"#ADC2B8",alignItems:"center",justifyContent:"center",marginTop:1},consentText:{flex:1,fontFamily:FONT.regular,fontSize:12,lineHeight:19,color:"#526B60"},security:{flexDirection:"row",justifyContent:"center",alignItems:"center",gap:7,paddingTop:6,borderTopWidth:1,borderColor:"#ECF2EF"},securityText:{fontFamily:FONT.medium,fontSize:10,color:"#6F8980"},finePrint:{fontFamily:FONT.regular,fontSize:11,lineHeight:17,color:"#667B70",textAlign:"center"},configure:{flexDirection:"row",justifyContent:"center",alignItems:"center",gap:7,minHeight:36},configureText:{fontFamily:FONT.medium,fontSize:10,color:"#85968F"},footer:{fontFamily:FONT.medium,fontSize:9,color:"#A0B0A7",textAlign:"center",marginTop:4},
});
