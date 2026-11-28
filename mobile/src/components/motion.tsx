import React, { useState } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
export function Reveal({children,delay=0}:{children:React.ReactNode;delay?:number}) {
  const reduced=useReducedMotion();
  return <Animated.View entering={reduced?undefined:FadeInDown.duration(240).delay(delay)}>{children}</Animated.View>;
}
export function Touch({children,style,...props}:Omit<PressableProps,"children"|"style">&{children:React.ReactNode;style?:StyleProp<ViewStyle>}) {
  const [pressed,setPressed]=useState(false);const reduced=useReducedMotion();
  return <Pressable {...props} accessibilityRole={props.accessibilityRole??"button"} onPressIn={()=>setPressed(true)} onPressOut={()=>setPressed(false)}><Animated.View style={[style,{transform:[{scale:pressed&&!reduced?0.975:1}],opacity:pressed?0.88:1,transitionProperty:["transform","opacity"],transitionDuration:120}]}>{children}</Animated.View></Pressable>;
}
