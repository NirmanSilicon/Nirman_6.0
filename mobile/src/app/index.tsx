import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useSession } from "../session";
import { C } from "../theme";
export default function Index() {
  const { ready } = useSession();
  return !ready ? (
    <ActivityIndicator color={C.lime} />
  ) : (
    <Redirect href={"/welcome"} />
  );
}
