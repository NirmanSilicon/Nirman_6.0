import React from "react";
import { Text, View } from "react-native";
import Svg, { Line, Circle, Text as SvgText } from "react-native-svg";
import { C, FONT } from "../theme";
const point = (angle: number, radius: number) => ({ x: 180 + Math.cos(angle * Math.PI / 180) * radius, y: 180 + Math.sin(angle * Math.PI / 180) * radius });
export function ScoreDial({score}:{score:number|null}) {
  const bounded = score == null ? null : Math.min(100,Math.max(0,score));
  return <View accessible accessibilityLabel={bounded == null ? "No assessment yet" : `Synthetic demo index ${score!.toFixed(2)} out of 100`} style={{height:215,width:"100%",alignItems:"center"}}>
    <Svg width="100%" height="205" viewBox="0 0 360 225">
      {Array.from({length:91},(_,i)=>{const angle=180+i*2; const a=point(angle,123),b=point(angle,156); const colors=["#E96D70","#F28C60","#F3B75A","#DBCF52","#9CC956","#42AA73"]; return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={bounded==null ? "#DCE6DF" : colors[Math.min(5,Math.floor(i/16))]} strokeWidth={1.8}/>;})}
      {[0,25,50,75,100].map(v=>{const p=point(180+v*1.8,173);return <SvgText key={v} x={p.x} y={p.y+4} fontSize="10" fill="#728078" textAnchor="middle">{v}</SvgText>;})}
      {bounded!=null&&(()=>{const p=point(180+bounded*1.8,140);return <Circle cx={p.x} cy={p.y} r="6" fill={C.white} stroke={C.ink} strokeWidth="2"/>;})()}
    </Svg>
    <View style={{position:"absolute",top:102,alignItems:"center",gap:1}}><Text style={{fontFamily:FONT.regular,fontSize:62,lineHeight:73,letterSpacing:-4,color:C.ink}}>{bounded==null?"—":score!.toFixed(0)}</Text><Text style={{fontFamily:FONT.medium,fontSize:10,color:C.muted}}>SYNTHETIC DEMO INDEX / 100</Text></View>
  </View>;
}
