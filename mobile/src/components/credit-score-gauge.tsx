import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { FONT } from "../theme";

export function CreditScoreGauge({ score }: { score: number | null }) {
  const progress = useRef(new Animated.Value(0)).current;
  const value = score == null ? 0 : Math.max(0, Math.min(100, score));
  useEffect(() => { Animated.spring(progress, { toValue: value, damping: 18, stiffness: 90, mass: 0.8, useNativeDriver: true }).start(); }, [progress, value]);
  const rotate = progress.interpolate({ inputRange: [0, 100], outputRange: ["-62deg", "62deg"] });
  return <View accessible accessibilityLabel={score == null ? "No assessment yet" : `Financial behaviour index ${value.toFixed(2)} out of 100`} style={s.wrap}>
    <Image source={require("../../assets/brand/score-meter.png")} resizeMode="contain" style={s.meter} accessibilityIgnoresInvertColors />
    <View style={s.needlePivot}><Animated.View style={[s.needle, { transform: [{ rotate }] }]} /><View style={s.pin} /></View>
    <Text style={[s.edge, { left: 18 }]}>0</Text><Text style={[s.edge, { right: 18 }]}>100</Text>
    <View style={s.score}><Text style={s.scoreLabel}>Your behaviour index</Text><Text style={s.number}>{score == null ? "—" : value.toFixed(2)}</Text><View style={[s.category, value >= 70 ? s.good : value >= 45 ? s.developing : s.building]}><Text style={s.categoryText}>{score == null ? "Add a statement" : value >= 85 ? "Excellent" : value >= 70 ? "Good" : value >= 45 ? "Developing" : "Building"}</Text></View></View>
  </View>;
}
const s=StyleSheet.create({wrap:{height:286,width:"100%",position:"relative",alignItems:"center"},meter:{position:"absolute",top:0,width:"100%",height:178},needlePivot:{position:"absolute",top:143,left:"50%",width:0,height:0,alignItems:"center"},needle:{position:"absolute",bottom:0,width:3,height:67,backgroundColor:"#111820",borderRadius:2,transformOrigin:"bottom"},pin:{width:13,height:13,borderRadius:7,backgroundColor:"#111820"},edge:{position:"absolute",top:151,fontFamily:FONT.medium,fontSize:12,color:"#D8E8F1"},score:{position:"absolute",top:166,alignItems:"center",backgroundColor:"transparent"},scoreLabel:{fontFamily:FONT.medium,fontSize:11,color:"#D5E7F2",marginBottom:1},number:{fontFamily:FONT.heavy,fontSize:42,lineHeight:49,color:"#FFFFFF",letterSpacing:-1},category:{paddingHorizontal:24,paddingVertical:7,borderRadius:20,marginTop:4},good:{backgroundColor:"#E5F8B8"},developing:{backgroundColor:"#FFF0B5"},building:{backgroundColor:"#FFE0D8"},categoryText:{fontFamily:FONT.bold,fontSize:14,color:"#1A6B3C"}});
