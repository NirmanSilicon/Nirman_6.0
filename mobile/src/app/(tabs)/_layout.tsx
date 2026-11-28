import React from "react";
import { Tabs, Redirect, router, useFocusEffect, usePathname } from "expo-router";
import { ActivityIndicator, BackHandler, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../session";
import { Icon, type IconName } from "../../components/ui";
import { C, FONT } from "../../theme";
const items = [
  {name:"home",title:"Home",icon:"home-outline"},
  {name:"insights",title:"Analysis",icon:"pie-chart-outline"},
  {name:"twin",title:"Planner",icon:"sparkles-outline"},
  {name:"vault",title:"My vault",icon:"folder-open-outline"},
];
export default function TabLayout() {
  const {session,ready}=useSession();
  const insets=useSafeAreaInsets();
  const pathname = usePathname();
  useFocusEffect(React.useCallback(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (["/insights", "/twin", "/vault"].includes(pathname)) {
        router.replace("/home");
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [pathname]));
  if(!ready) return <ActivityIndicator color={C.green}/>;
  if(!session) return <Redirect href="/welcome"/>;
  return <Tabs screenOptions={{headerShown:false,animation:"none",sceneStyle:{backgroundColor:C.bg}}}
    tabBar={({state,navigation})=><View accessibilityRole="tablist" style={{position:"absolute",bottom:Math.max(12,insets.bottom),left:14,right:14,backgroundColor:"#FFFFFF",borderRadius:34,padding:8,flexDirection:"row",gap:5,maxWidth:520,alignSelf:"center"}}>
      {state.routes.map((route,index)=>{const item=items.find(i=>i.name===route.name); if(!item)return null;const selected=state.index===index;return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{selected}} onPress={()=>{const event=navigation.emit({type:"tabPress",target:route.key,canPreventDefault:true});if(!selected&&!event.defaultPrevented)navigation.navigate(route.name);}} style={({pressed})=>[{height:48,flex:selected?1.7:1,borderRadius:26,backgroundColor:selected?"#123E78":"transparent",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},pressed&&{opacity:0.7}]}><Icon name={item.icon as IconName} size={23} color={selected?"#FFFFFF":"#8499AF"}/>{selected&&<Text numberOfLines={1} style={{fontFamily:FONT.bold,fontSize:12,color:"#FFFFFF",flexShrink:1}}>{item.title}</Text>}</Pressable>;})}
    </View>}>
    {items.map(item=><Tabs.Screen key={item.name} name={item.name} options={{title:item.title}}/>)}
  </Tabs>;
}
