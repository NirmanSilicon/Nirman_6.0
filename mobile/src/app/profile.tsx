import React, { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import {
  Badge,
  Body,
  Button,
  Card,
  Field,
  Icon,
  Label,
  Screen,
  Section,
  u,
} from "../components/ui";
import { C, FONT } from "../theme";
import { useSession } from "../session";
export default function Profile() {
  const state = useSession();
  const [deleting, setDeleting] = useState(false),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  if (!state.session) return <Redirect href="/welcome" />;
  return (
    <Screen
      title="Your account. Your control."
      subtitle="A private space for your financial story."
    >
      <Card style={{ backgroundColor: "#102E62", borderColor: "#1B5B84", padding: 22, gap: 16 }}>
        <View style={u.row}>
          <View style={[u.round, { backgroundColor: "#FFFFFF22" }]}><Icon name="person-outline" color="#8AF05B" /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 21, color: "#FFFFFF" }}>{state.session.user.name}</Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: "#C5DCEC", marginTop: 4 }}>{state.session.user.email}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}><Badge>PERSONAL ACCOUNT</Badge><Badge>PRIVATE</Badge></View>
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, lineHeight: 18, color: "#D5E7F2" }}>
          This local version uses password sign-in. No OTP, verified-email
          service or password reset is connected.
        </Text>
      </Card>
      <View style={{ flexDirection: "row", gap: 10 }}><Card style={{ flex: 1, padding: 15 }}><Label>STATEMENTS</Label><Text style={u.number}>{state.records.length}</Text><Body>saved in vault</Body></Card><Card style={{ flex: 1, padding: 15 }}><Label>ACCOUNT STATUS</Label><Text style={{ fontFamily: FONT.bold, fontSize: 18, color: C.green, marginTop: 8 }}>Active</Text><Body>secure session</Body></Card></View>
      <Section title="Account & preferences" />
      <Card style={{ gap: 0, padding: 5 }}>
        <Button secondary title="How the demo index works" onPress={() => router.push("/guide")} />
      </Card>
      <Section title="Privacy & storage" />
      <Card style={{ backgroundColor: "#F5FAFF" }}>
        <Body>
          Statements and results are encrypted at rest in your account. Your
          password is stored as a salted scrypt hash. Android keeps the session
          token in SecureStore; the web preview keeps it in memory.
        </Body>
        <Body>
          The server retains your files until you delete them or your account.
          There is no automatic sharing or monthly merging of unrelated
          accounts. Examples opened with Try sample are not saved automatically.
        </Body>
        <Label>Server: {state.session.url}</Label>
        <Label>
          {state.records.length} saved statements · up to 100 files / 100 MB
        </Label>
      </Card>
      <Card style={{ gap: 4, padding: 5 }}><Button secondary title="Sign out" icon="log-out-outline" onPress={() => state.perform("Signing out", state.signOut)} /></Card>
      <Section title="Delete account" />
      <Card>
        <Body>
          Delete all saved statements, assessments, consent records and active
          sessions in this account. This is permanent in the application. Copies
          previously shared by you and external server backups are outside the
          app’s deletion scope.
        </Body>
        {deleting ? (
          <>
            <Field
              label="Confirm your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <Field
              label="Type DELETE to confirm"
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
            />
            <Button
              disabled={
                confirmation !== "DELETE" ||
                password.length < 12 ||
                !!state.busy
              }
              title="Delete my account permanently"
              onPress={() =>
                state.perform("Deleting your private account", async () => {
                  await state.erase(password);
                  setPassword("");
                })
              }
            />
            <Button
              secondary
              title="Keep my account"
              onPress={() => {
                setDeleting(false);
                setPassword("");
                setConfirmation("");
              }}
            />
          </>
        ) : (
          <Button
            secondary
            title="Review account deletion"
            icon="trash-outline"
            onPress={() => setDeleting(true)}
          />
        )}
      </Card>
    </Screen>
  );
}
