import React from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, G } from "react-native-svg";
export function WelcomeArt({compact=false}:{compact?:boolean}) {
  return <Svg width="100%" height={compact?150:280} viewBox="0 0 360 280">
    <Defs><LinearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF"/><Stop offset="1" stopColor="#CFF5EC"/></LinearGradient></Defs>
    <Circle cx="185" cy="139" r="112" fill="#FFFFFF" opacity=".09"/>
    <Circle cx="185" cy="139" r="134" stroke="#8CE3DC" strokeDasharray="4 8" fill="none" opacity=".35"/>
    <G transform="rotate(-8 180 140)"><Rect x="83" y="38" width="190" height="207" rx="24" fill="#075D68" opacity=".15"/><Rect x="76" y="30" width="190" height="207" rx="24" fill="url(#paper)"/><Rect x="99" y="53" width="40" height="8" rx="4" fill="#A2DCD4"/><Rect x="99" y="70" width="85" height="6" rx="3" fill="#D2EAE7"/>
      <Path d="M108 151A62 62 0 0 1 232 151" stroke="#DBECE6" strokeWidth="11" fill="none" strokeLinecap="round"/><Path d="M108 151A62 62 0 0 1 212 105" stroke="#17A47F" strokeWidth="11" fill="none" strokeLinecap="round"/>
      <Path d="m153 146 14 13 25-29" stroke="#08795F" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Rect x="99" y="181" width="63" height="32" rx="10" fill="#D1EDE4"/><Rect x="173" y="181" width="69" height="32" rx="10" fill="#D6E7F5"/><Rect x="110" y="192" width="29" height="5" rx="2" fill="#6CB9A3"/><Rect x="184" y="192" width="36" height="5" rx="2" fill="#84B4D4"/>
    </G>
    <G transform="rotate(9 272 174)"><Rect x="237" y="116" width="83" height="114" rx="17" fill="#0E5469"/><Rect x="245" y="126" width="67" height="83" rx="9" fill="#F0FFFA"/><Rect x="252" y="172" width="10" height="26" rx="3" fill="#9ED9C4"/><Rect x="268" y="157" width="10" height="41" rx="3" fill="#54BEA1"/><Rect x="284" y="144" width="10" height="54" rx="3" fill="#11987A"/><Circle cx="278" cy="219" r="3" fill="#A1E5DB"/></G>
    <Rect x="35" y="100" width="97" height="60" rx="14" fill="#FFFFFF" opacity=".92"/><Circle cx="58" cy="123" r="10" fill="#C6EDE2"/><Path d="m53 123 4 4 7-8" stroke="#159575" strokeWidth="2.5" fill="none" strokeLinecap="round"/><Rect x="76" y="115" width="38" height="5" rx="2" fill="#76B6AA"/><Rect x="76" y="126" width="27" height="4" rx="2" fill="#C3DCD8"/>
    <Circle cx="291" cy="60" r="18" fill="#AEEDDA"/><Path d="m283 64 7-8 7 1m-1-6 1 6-6 1" stroke="#0A876C" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <Circle cx="50" cy="207" r="5" fill="#B6EEDC"/><Circle cx="319" cy="93" r="4" fill="#8ADFD4"/>
  </Svg>;
}
