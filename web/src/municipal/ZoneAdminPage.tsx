import React, { useState, useEffect, useCallback } from "react";
import { api, describeApiError } from "../api/client";
import type {
  ZoneOut,
  ZoneUpsert,
  FacilityOut,
  FacilityUpsert,
  BayOut,
  BayWithStatus,
  BayUpsert,
  FeeOut,
  FeeUpsert,
  UserOut,
  UserApproval,
  RoleGrant,
  Role,
  BayType,
  VehicleCategory,
  Page,
  BusinessAdminOut,
  ModelVersionOut,
  ModelPromote,
  AuditOut,
  LatLon,
  CrowdThresholds,
  ReservationRules,
} from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ZoneMap } from "../components/ZoneMap";
import { DataBadge } from "../components/DataBadge";

type AdminTab =
  | "Zones"
  | "Facilities and bays"
  | "Fees"
  | "Accounts"
  | "Businesses"
  | "Models"
  | "Audit";

const TABS: AdminTab[] = [
  "Zones",
  "Facilities and bays",
  "Fees",
  "Accounts",
  "Businesses",
  "Models",
  "Audit",
];

const ALL_ROLES: Role[] = [
  "driver",
  "business_operator",
  "municipal_admin",
  "field_operator",
  "system_admin",
];

const VEHICLE_CATEGORIES: VehicleCategory[] = [
  "car",
  "two_wheeler",
  "van",
  "truck",
  "bus",
];

export default function ZoneAdminPage(): JSX.Element {
  const { roles } = useAuth();
  const isSystemAdmin = roles.has("system_admin");

  const [currentTab, setCurrentTab] = useState<AdminTab>("Zones");
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ==========================================
  // TAB 1: ZONES STATE
  // ==========================================
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [zonesLoading, setZonesLoading] = useState<boolean>(true);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");

  // Zones form state
  const [zoneFormMode, setZoneFormMode] = useState<"create" | "edit">("create");
  const [zoneName, setZoneName] = useState<string>("");
  const [zoneKind, setZoneKind] = useState<"parking" | "loading" | "mixed">("parking");
  const [zoneCityId, setZoneCityId] = useState<string>("00000000-0000-4000-8000-000000000001");
  const [zoneLat, setZoneLat] = useState<string>("");
  const [zoneLon, setZoneLon] = useState<string>("");
  const [zoneBoundaryStr, setZoneBoundaryStr] = useState<string>("");
  const [zoneScheduleStr, setZoneScheduleStr] = useState<string>("");
  const [zoneActive, setZoneActive] = useState<boolean>(true);

  // Crowd thresholds form state
  const [ctOccModerate, setCtOccModerate] = useState<string>("");
  const [ctOccHigh, setCtOccHigh] = useState<string>("");
  const [ctOccVeryHigh, setCtOccVeryHigh] = useState<string>("");
  const [ctPedModerate, setCtPedModerate] = useState<string>("");
  const [ctPedHigh, setCtPedHigh] = useState<string>("");
  const [ctPedVeryHigh, setCtPedVeryHigh] = useState<string>("");

  // Reservation rules form state (Never pre-fill numeric defaults!)
  const [rrGraceMin, setRrGraceMin] = useState<string>("");
  const [rrPendingTtlMin, setRrPendingTtlMin] = useState<string>("");
  const [rrCancelCutoffMin, setRrCancelCutoffMin] = useState<string>("");
  const [rrOverstayGraceMin, setRrOverstayGraceMin] = useState<string>("");

  const [savingZone, setSavingZone] = useState<boolean>(false);
  const [zoneActionMessage, setZoneActionMessage] = useState<string | null>(null);

  // ==========================================
  // TAB 2: FACILITIES AND BAYS STATE
  // ==========================================
  const [facZoneId, setFacZoneId] = useState<string>("");
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState<boolean>(false);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");

  // Facility form
  const [facFormMode, setFacFormMode] = useState<"create" | "edit">("create");
  const [facName, setFacName] = useState<string>("");
  const [facKind, setFacKind] = useState<"facility" | "roadside">("facility");
  const [facLat, setFacLat] = useState<string>("");
  const [facLon, setFacLon] = useState<string>("");
  const [facSupportsRes, setFacSupportsRes] = useState<boolean>(true);
  const [facAddress, setFacAddress] = useState<string>("");
  const [savingFac, setSavingFac] = useState<boolean>(false);

  // Bays state
  const [bays, setBays] = useState<BayWithStatus[]>([]);
  const [baysLoading, setBaysLoading] = useState<boolean>(false);
  const [baysError, setBaysError] = useState<string | null>(null);
  const [selectedBayId, setSelectedBayId] = useState<string>("");

  // Bay form
  const [bayFormMode, setBayFormMode] = useState<"create" | "edit">("create");
  const [bayCode, setBayCode] = useState<string>("");
  const [bayType, setBayType] = useState<BayType>("regular");
  const [bayLat, setBayLat] = useState<string>("");
  const [bayLon, setBayLon] = useState<string>("");
  const [bayCategories, setBayCategories] = useState<VehicleCategory[]>(["car"]);
  const [bayOutOfService, setBayOutOfService] = useState<boolean>(false);
  const [savingBay, setSavingBay] = useState<boolean>(false);

  // ==========================================
  // TAB 3: FEES STATE
  // ==========================================
  const [feeFacZoneId, setFeeFacZoneId] = useState<string>("");
  const [feeFacList, setFeeFacList] = useState<FacilityOut[]>([]);
  const [selectedFeeFacId, setSelectedFeeFacId] = useState<string>("");
  const [feeBayType, setFeeBayType] = useState<BayType>("regular");
  const [feeRatePerHour, setFeeRatePerHour] = useState<string>("");
  const [feeCurrency, setFeeCurrency] = useState<string>("INR");
  const [feeEffectiveFrom, setFeeEffectiveFrom] = useState<string>("");
  const [feeEffectiveTo, setFeeEffectiveTo] = useState<string>("");
  const [savingFee, setSavingFee] = useState<boolean>(false);
  const [feeSuccessMessage, setFeeSuccessMessage] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);

  // ==========================================
  // TAB 4: ACCOUNTS STATE
  // ==========================================
  const [accounts, setAccounts] = useState<UserOut[]>([]);
  const [accountsLoading, setAccountsLoading] = useState<boolean>(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Role grant form (system_admin only)
  const [grantUserId, setGrantUserId] = useState<string>("");
  const [grantRole, setGrantRole] = useState<Role>("business_operator");
  const [grantingRole, setGrantingRole] = useState<boolean>(false);

  // ==========================================
  // TAB 5: BUSINESSES STATE
  // ==========================================
  const [businesses, setBusinesses] = useState<BusinessAdminOut[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState<boolean>(false);
  const [businessesError, setBusinessesError] = useState<string | null>(null);
  const [bizStatusFilter, setBizStatusFilter] = useState<string>("all");
  const [actionBizId, setActionBizId] = useState<string | null>(null);

  // ==========================================
  // TAB 6: MODELS STATE
  // ==========================================
  const [models, setModels] = useState<ModelVersionOut[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [promoteCandidateModel, setPromoteCandidateModel] = useState<ModelVersionOut | null>(null);
  const [promotingModel, setPromotingModel] = useState<boolean>(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  // ==========================================
  // TAB 7: AUDIT STATE
  // ==========================================
  const [auditLogs, setAuditLogs] = useState<AuditOut[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("all");
  const [auditActionQuery, setAuditActionQuery] = useState<string>("");

  // ==========================================
  // CONFIRMATION MODAL STATE
  // ==========================================
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  // ==========================================
  // DATA LOADERS
  // ==========================================

  // Load Zones
  const loadZones = useCallback(async () => {
    try {
      setZonesLoading(true);
      setZonesError(null);
      const res = await api<Page<ZoneOut>>("/zones?limit=200");
      setZones(res.items);
      if (res.items.length > 0 && res.items[0]) {
        if (!selectedZoneId) {
          setSelectedZoneId(res.items[0].id);
        }
        if (!facZoneId) {
          setFacZoneId(res.items[0].id);
        }
        if (!feeFacZoneId) {
          setFeeFacZoneId(res.items[0].id);
        }
      }
    } catch (err) {
      setZonesError(describeApiError(err));
    } finally {
      setZonesLoading(false);
    }
  }, [selectedZoneId, facZoneId, feeFacZoneId]);

  // Load Facilities for Tab 2
  const loadFacilities = useCallback(async (zoneId: string) => {
    if (!zoneId) {
      setFacilities([]);
      return;
    }
    try {
      setFacilitiesLoading(true);
      setFacilitiesError(null);
      const res = await api<FacilityOut[]>(`/zones/${zoneId}/facilities`);
      setFacilities(res);
      if (res.length > 0 && res[0]) {
        setSelectedFacilityId(res[0].id);
      } else {
        setSelectedFacilityId("");
      }
    } catch (err) {
      setFacilitiesError(describeApiError(err));
      setFacilities([]);
    } finally {
      setFacilitiesLoading(false);
    }
  }, []);

  // Load Bays for Tab 2
  const loadBays = useCallback(async (zoneId: string, facilityId: string) => {
    if (!zoneId || !facilityId) {
      setBays([]);
      return;
    }
    try {
      setBaysLoading(true);
      setBaysError(null);
      const res = await api<BayWithStatus[]>(
        `/zones/${zoneId}/bays?facility_id=${encodeURIComponent(facilityId)}`
      );
      setBays(res);
    } catch (err) {
      setBaysError(describeApiError(err));
      setBays([]);
    } finally {
      setBaysLoading(false);
    }
  }, []);

  // Load Facilities for Tab 3 (Fees)
  const loadFeeFacilities = useCallback(async (zoneId: string) => {
    if (!zoneId) {
      setFeeFacList([]);
      return;
    }
    try {
      const res = await api<FacilityOut[]>(`/zones/${zoneId}/facilities`);
      setFeeFacList(res);
      if (res.length > 0 && res[0]) {
        setSelectedFeeFacId(res[0].id);
        if (res[0].fee) {
          setFeeRatePerHour(String(res[0].fee.rate_per_hour));
          setFeeCurrency(res[0].fee.currency);
          setFeeBayType(res[0].fee.bay_type);
        } else {
          setFeeRatePerHour("");
        }
      } else {
        setSelectedFeeFacId("");
        setFeeRatePerHour("");
      }
    } catch {
      setFeeFacList([]);
    }
  }, []);

  // Load Accounts
  const loadAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      setAccountsError(null);
      let queryPath = "/users?limit=100";
      if (accountStatusFilter !== "all") {
        queryPath += `&status=${encodeURIComponent(accountStatusFilter)}`;
      }
      const res = await api<Page<UserOut>>(queryPath);
      setAccounts(res.items);
    } catch (err) {
      setAccountsError(describeApiError(err));
    } finally {
      setAccountsLoading(false);
    }
  }, [accountStatusFilter]);

  // Load Businesses
  const loadBusinesses = useCallback(async () => {
    try {
      setBusinessesLoading(true);
      setBusinessesError(null);
      let queryPath = "/admin/businesses?limit=100";
      if (bizStatusFilter !== "all") {
        queryPath += `&status=${encodeURIComponent(bizStatusFilter)}`;
      }
      const res = await api<Page<BusinessAdminOut>>(queryPath);
      setBusinesses(res.items);
    } catch (err) {
      setBusinessesError(describeApiError(err));
    } finally {
      setBusinessesLoading(false);
    }
  }, [bizStatusFilter]);

  // Load Models
  const loadModels = useCallback(async () => {
    try {
      setModelsLoading(true);
      setModelsError(null);
      const res = await api<ModelVersionOut[]>("/forecast/models");
      setModels(res);
    } catch (err) {
      setModelsError(describeApiError(err));
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // Load Audit Logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);
      let queryPath = "/audit?limit=100";
      if (auditEntityFilter !== "all") {
        queryPath += `&entity_type=${encodeURIComponent(auditEntityFilter)}`;
      }
      if (auditActionQuery.trim()) {
        queryPath += `&action=${encodeURIComponent(auditActionQuery.trim())}`;
      }
      const res = await api<Page<AuditOut>>(queryPath);
      setAuditLogs(res.items);
    } catch (err) {
      setAuditError(describeApiError(err));
    } finally {
      setAuditLoading(false);
    }
  }, [auditEntityFilter, auditActionQuery]);

  // Initial mount load
  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Tab switch effect
  useEffect(() => {
    setGlobalError(null);
    if (currentTab === "Zones") {
      loadZones();
    } else if (currentTab === "Facilities and bays") {
      if (facZoneId) {
        loadFacilities(facZoneId);
      }
    } else if (currentTab === "Fees") {
      if (feeFacZoneId) {
        loadFeeFacilities(feeFacZoneId);
      }
    } else if (currentTab === "Accounts") {
      loadAccounts();
    } else if (currentTab === "Businesses") {
      loadBusinesses();
    } else if (currentTab === "Models") {
      loadModels();
    } else if (currentTab === "Audit") {
      loadAuditLogs();
    }
  }, [
    currentTab,
    facZoneId,
    feeFacZoneId,
    loadZones,
    loadFacilities,
    loadFeeFacilities,
    loadAccounts,
    loadBusinesses,
    loadModels,
    loadAuditLogs,
  ]);

  // When selected facility changes in Tab 2, load bays
  useEffect(() => {
    if (facZoneId && selectedFacilityId) {
      loadBays(facZoneId, selectedFacilityId);
    } else {
      setBays([]);
    }
  }, [facZoneId, selectedFacilityId, loadBays]);

  // When selected fee facility changes in Tab 3, update inputs
  useEffect(() => {
    const f = feeFacList.find((fac) => fac.id === selectedFeeFacId);
    if (f && f.fee) {
      setFeeRatePerHour(String(f.fee.rate_per_hour));
      setFeeCurrency(f.fee.currency);
      setFeeBayType(f.fee.bay_type);
    } else {
      setFeeRatePerHour("");
    }
  }, [selectedFeeFacId, feeFacList]);

  // Populate Zone form when selecting zone for edit
  const selectZoneForEdit = (z: ZoneOut) => {
    setSelectedZoneId(z.id);
    setZoneFormMode("edit");
    setZoneName(z.name);
    setZoneKind(z.kind);
    setZoneCityId(z.city_id);
    setZoneLat(String(z.centroid.lat));
    setZoneLon(String(z.centroid.lon));
    setZoneActive(z.is_active);
    setZoneScheduleStr(z.operating_schedule ? JSON.stringify(z.operating_schedule, null, 2) : "");
    setZoneBoundaryStr("");
    // Do not pre-fill numeric defaults for reservation rules
    setRrGraceMin("");
    setRrPendingTtlMin("");
    setRrCancelCutoffMin("");
    setRrOverstayGraceMin("");
    setCtOccModerate("");
    setCtOccHigh("");
    setCtOccVeryHigh("");
    setCtPedModerate("");
    setCtPedHigh("");
    setCtPedVeryHigh("");
    setZoneActionMessage(null);
  };

  const resetZoneFormForCreate = () => {
    setZoneFormMode("create");
    setSelectedZoneId("");
    setZoneName("");
    setZoneKind("parking");
    setZoneCityId("00000000-0000-4000-8000-000000000001");
    setZoneLat("");
    setZoneLon("");
    setZoneBoundaryStr("");
    setZoneScheduleStr("");
    setZoneActive(true);
    setRrGraceMin("");
    setRrPendingTtlMin("");
    setRrCancelCutoffMin("");
    setRrOverstayGraceMin("");
    setCtOccModerate("");
    setCtOccHigh("");
    setCtOccVeryHigh("");
    setCtPedModerate("");
    setCtPedHigh("");
    setCtPedVeryHigh("");
    setZoneActionMessage(null);
  };

  // ==========================================
  // HANDLERS
  // ==========================================

  // Zone save handler
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setZoneActionMessage(null);
    setGlobalError(null);

    const latNum = parseFloat(zoneLat);
    const lonNum = parseFloat(zoneLon);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setGlobalError("Valid numeric centroid latitude and longitude are required.");
      return;
    }

    // Boundary parsing
    let boundaryList: LatLon[] | null = null;
    if (zoneBoundaryStr.trim()) {
      try {
        const parsed = JSON.parse(zoneBoundaryStr.trim());
        if (!Array.isArray(parsed) || parsed.length < 4) {
          setGlobalError("Boundary must be a list of at least 4 coordinate objects [{lat, lon}, ...] with first == last.");
          return;
        }
        boundaryList = parsed as LatLon[];
      } catch {
        setGlobalError("Boundary must be valid JSON in [{lat, lon}, ...] format.");
        return;
      }
    }

    // Schedule parsing
    let scheduleObj: Record<string, [string, string][]> | null = null;
    if (zoneScheduleStr.trim()) {
      try {
        scheduleObj = JSON.parse(zoneScheduleStr.trim());
      } catch {
        setGlobalError("Operating schedule must be valid JSON (e.g. {\"mon\": [[\"08:00\", \"20:00\"]]}).");
        return;
      }
    }

    // Crowd thresholds validation
    let crowdThresholds: CrowdThresholds | null = null;
    if (ctOccModerate || ctOccHigh || ctOccVeryHigh || ctPedModerate || ctPedHigh || ctPedVeryHigh) {
      const oMod = parseFloat(ctOccModerate);
      const oHi = parseFloat(ctOccHigh);
      const oVHi = parseFloat(ctOccVeryHigh);
      const pMod = parseFloat(ctPedModerate);
      const pHi = parseFloat(ctPedHigh);
      const pVHi = parseFloat(ctPedVeryHigh);

      if (
        isNaN(oMod) || isNaN(oHi) || isNaN(oVHi) ||
        isNaN(pMod) || isNaN(pHi) || isNaN(pVHi)
      ) {
        setGlobalError("All crowd threshold values must be provided if any threshold is set.");
        return;
      }

      if (!(oMod >= 0 && oMod < oHi && oHi < oVHi)) {
        setGlobalError("Occupancy percentage thresholds must be strictly increasing: 0 <= moderate < high < very_high.");
        return;
      }
      if (!(pMod >= 0 && pMod < pHi && pHi < pVHi)) {
        setGlobalError("Pedestrian count thresholds must be strictly increasing: 0 <= moderate < high < very_high.");
        return;
      }

      crowdThresholds = {
        occupancy_pct: { moderate: oMod, high: oHi, very_high: oVHi },
        pedestrians: { moderate: pMod, high: pHi, very_high: pVHi },
      };
    }

    // Reservation rules validation (strictly positive integers, or entire block empty)
    let reservationRules: ReservationRules | null = null;
    if (rrGraceMin || rrPendingTtlMin || rrCancelCutoffMin || rrOverstayGraceMin) {
      const g = parseInt(rrGraceMin, 10);
      const ttl = parseInt(rrPendingTtlMin, 10);
      const cut = parseInt(rrCancelCutoffMin, 10);
      const over = parseInt(rrOverstayGraceMin, 10);

      if (
        isNaN(g) || isNaN(ttl) || isNaN(cut) || isNaN(over) ||
        g <= 0 || ttl <= 0 || cut <= 0 || over <= 0
      ) {
        setGlobalError("All reservation rules (grace_min, pending_ttl_min, cancel_cutoff_min, overstay_grace_min) must be positive integers > 0, or leave the entire block empty.");
        return;
      }

      reservationRules = {
        grace_min: g,
        pending_ttl_min: ttl,
        cancel_cutoff_min: cut,
        overstay_grace_min: over,
      };
    }

    const payload: ZoneUpsert = {
      city_id: zoneCityId,
      name: zoneName.trim(),
      kind: zoneKind,
      centroid: { lat: latNum, lon: lonNum },
      boundary: boundaryList,
      operating_schedule: scheduleObj,
      crowd_thresholds: crowdThresholds,
      reservation_rules: reservationRules,
      is_active: zoneActive,
    };

    try {
      setSavingZone(true);
      if (zoneFormMode === "create") {
        await api<ZoneOut>("/admin/zones", { method: "PUT", body: payload });
        setZoneActionMessage(`Zone "${payload.name}" created successfully.`);
      } else {
        await api<ZoneOut>(`/admin/zones/${selectedZoneId}`, { method: "PUT", body: payload });
        setZoneActionMessage(`Zone "${payload.name}" updated successfully.`);
      }
      await loadZones();
    } catch (err) {
      setGlobalError(describeApiError(err));
    } finally {
      setSavingZone(false);
    }
  };

  // Facility save handler
  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    if (!facZoneId) {
      setGlobalError("Please select a zone first.");
      return;
    }
    const latNum = parseFloat(facLat);
    const lonNum = parseFloat(facLon);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setGlobalError("Valid facility location latitude and longitude are required.");
      return;
    }

    const payload: FacilityUpsert = {
      zone_id: facZoneId,
      name: facName.trim(),
      kind: facKind,
      location: { lat: latNum, lon: lonNum },
      supports_reservation: facSupportsRes,
      address: facAddress.trim() || null,
    };

    try {
      setSavingFac(true);
      if (facFormMode === "create") {
        await api<FacilityOut>("/admin/facilities", { method: "PUT", body: payload });
      } else {
        await api<FacilityOut>(`/admin/facilities/${selectedFacilityId}`, {
          method: "PUT",
          body: payload,
        });
      }
      setFacName("");
      setFacAddress("");
      setFacLat("");
      setFacLon("");
      setFacFormMode("create");
      await loadFacilities(facZoneId);
    } catch (err) {
      setGlobalError(describeApiError(err));
    } finally {
      setSavingFac(false);
    }
  };

  // Bay save handler
  const handleSaveBay = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    if (!selectedFacilityId) {
      setGlobalError("Please select a facility first.");
      return;
    }
    const latNum = parseFloat(bayLat);
    const lonNum = parseFloat(bayLon);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setGlobalError("Valid bay location coordinates are required.");
      return;
    }

    // Check loading zone constraint
    const currentZone = zones.find((z) => z.id === facZoneId);
    if (bayType === "loading" && currentZone && currentZone.kind === "parking") {
      setGlobalError('Bay type "loading" is only selectable when the zone kind is "loading" or "mixed".');
      return;
    }

    const payload: BayUpsert = {
      facility_id: selectedFacilityId,
      code: bayCode.trim().toUpperCase(),
      bay_type: bayType,
      location: { lat: latNum, lon: lonNum },
      permitted_vehicle_categories: bayCategories,
      restrictions: null,
      out_of_service: bayOutOfService,
    };

    try {
      setSavingBay(true);
      if (bayFormMode === "create") {
        await api<BayOut>("/admin/bays", { method: "PUT", body: payload });
      } else {
        await api<BayOut>(`/admin/bays/${selectedBayId}`, { method: "PUT", body: payload });
      }
      setBayCode("");
      setBayLat("");
      setBayLon("");
      setBayOutOfService(false);
      setBayFormMode("create");
      setSelectedBayId("");
      await loadBays(facZoneId, selectedFacilityId);
      await loadZones(); // reload capacity
    } catch (err) {
      setGlobalError(describeApiError(err));
    } finally {
      setSavingBay(false);
    }
  };

  // Fee save handler
  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeSuccessMessage(null);
    setFeeError(null);

    if (!selectedFeeFacId) {
      setFeeError("Please select a facility.");
      return;
    }

    const rateNum = parseFloat(feeRatePerHour);
    if (isNaN(rateNum) || rateNum < 0) {
      setFeeError("Rate per hour must be a non-negative number.");
      return;
    }

    // At most 2 decimal places check
    const rateStr = String(feeRatePerHour);
    const decimalParts = rateStr.split(".");
    if (decimalParts.length > 1 && (decimalParts[1]?.length ?? 0) > 2) {
      setFeeError("Rate per hour must have at most 2 decimal places.");
      return;
    }

    if (feeEffectiveTo && feeEffectiveFrom && feeEffectiveTo <= feeEffectiveFrom) {
      setFeeError("effective_to date must be after effective_from date.");
      return;
    }

    const payload: FeeUpsert = {
      facility_id: selectedFeeFacId,
      bay_type: feeBayType,
      rate_per_hour: rateNum,
      currency: feeCurrency.trim() || "INR",
      effective_from: feeEffectiveFrom ? new Date(feeEffectiveFrom).toISOString() : new Date().toISOString(),
      effective_to: feeEffectiveTo ? new Date(feeEffectiveTo).toISOString() : null,
    };

    try {
      setSavingFee(true);
      const res = await api<FeeOut>("/admin/fees", { method: "PUT", body: payload });
      setFeeSuccessMessage(`Fee updated: ${res.currency} ${res.rate_per_hour}/hr for ${res.bay_type}.`);
      await loadFeeFacilities(feeFacZoneId);
    } catch (err) {
      setFeeError(describeApiError(err));
    } finally {
      setSavingFee(false);
    }
  };

  // Account Status (Approve / Suspend)
  const handleSetUserStatus = async (user: UserOut, status: "approved" | "suspended") => {
    const runStatusUpdate = async () => {
      try {
        setActionUserId(user.id);
        const payload: UserApproval = { status };
        await api<UserOut>(`/admin/users/${user.id}/status`, {
          method: "POST",
          body: payload,
        });
        await loadAccounts();
      } catch (err) {
        setAccountsError(describeApiError(err));
      } finally {
        setActionUserId(null);
      }
    };

    if (status === "suspended") {
      setConfirmModal({
        isOpen: true,
        title: `Confirm Suspension`,
        description: `Are you sure you want to suspend account ${user.email} (${user.full_name})? This will immediately revoke active access.`,
        onConfirm: async () => {
          await runStatusUpdate();
        },
      });
    } else {
      await runStatusUpdate();
    }
  };

  // Grant role (system_admin only)
  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId) return;
    try {
      setGrantingRole(true);
      const payload: RoleGrant = { role: grantRole };
      await api<UserOut>(`/admin/users/${grantUserId}/roles`, {
        method: "POST",
        body: payload,
      });
      await loadAccounts();
    } catch (err) {
      setAccountsError(describeApiError(err));
    } finally {
      setGrantingRole(false);
    }
  };

  // Revoke role (system_admin only)
  const handleRevokeRole = (user: UserOut, role: Role) => {
    setConfirmModal({
      isOpen: true,
      title: `Revoke Role "${role}"`,
      description: `Are you sure you want to remove role "${role}" from ${user.email}?`,
      onConfirm: async () => {
        try {
          await api<UserOut>(`/admin/users/${user.id}/roles/${role}`, {
            method: "DELETE",
          });
          await loadAccounts();
        } catch (err) {
          setAccountsError(describeApiError(err));
        }
      },
    });
  };

  // Business Status (Approve / Suspend)
  const handleSetBusinessStatus = (business: BusinessAdminOut, status: "approved" | "suspended") => {
    const runUpdate = async () => {
      try {
        setActionBizId(business.id);
        await api<BusinessAdminOut>(`/admin/businesses/${business.id}/status`, {
          method: "POST",
          body: { status },
        });
        await loadBusinesses();
      } catch (err) {
        setBusinessesError(describeApiError(err));
      } finally {
        setActionBizId(null);
      }
    };

    if (status === "suspended") {
      setConfirmModal({
        isOpen: true,
        title: "Confirm Business Suspension",
        description: `Are you sure you want to suspend business "${business.name}"? Active loading reservations will be restricted.`,
        onConfirm: async () => {
          await runUpdate();
        },
      });
    } else {
      runUpdate();
    }
  };

  // Model Promote
  const handleConfirmPromoteModel = async () => {
    if (!promoteCandidateModel) return;
    try {
      setPromotingModel(true);
      setPromoteError(null);
      const payload: ModelPromote = { model_version_id: promoteCandidateModel.id };
      await api<ModelVersionOut>("/admin/models/promote", {
        method: "POST",
        body: payload,
      });
      setPromoteCandidateModel(null);
      await loadModels();
    } catch (err) {
      setPromoteError(describeApiError(err));
    } finally {
      setPromotingModel(false);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.65rem", color: "#0f172a", fontWeight: 700 }}>
          Zone Administration & Operations Control
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
          Configure infrastructure zones, bays, fees, accounts, businesses, forecast models, and system audit logs.
        </p>
      </div>

      {globalError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "6px",
            marginBottom: "1.25rem",
            fontSize: "0.875rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{globalError}</span>
          <button
            onClick={() => setGlobalError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#991b1b",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid #e2e8f0",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => {
          const isActive = currentTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              style={{
                padding: "0.6rem 1.1rem",
                border: "none",
                background: "none",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#0284c7" : "#64748b",
                borderBottom: isActive ? "2px solid #0284c7" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ZONES */}
      {currentTab === "Zones" && (
        <div>
          {zonesLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading zones configuration...</div>
          ) : zonesError ? (
            <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px" }}>
              {zonesError}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Left Column: Map & Zones Table */}
              <div>
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", color: "#1e293b" }}>
                    Geographic Zone Map
                  </h3>
                  <ZoneMap
                    zones={zones}
                    selectedId={selectedZoneId}
                    onSelect={(id) => {
                      const z = zones.find((zn) => zn.id === id);
                      if (z) selectZoneForEdit(z);
                    }}
                    height="320px"
                  />
                </div>

                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    padding: "1rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>Zones List</h3>
                    <button
                      onClick={resetZoneFormForCreate}
                      style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: "#0284c7",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      + Create New Zone
                    </button>
                  </div>

                  {zones.length === 0 ? (
                    <div style={{ padding: "1rem", color: "#64748b", textAlign: "center" }}>No zones found.</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left", color: "#64748b" }}>
                            <th style={{ padding: "0.5rem" }}>Name</th>
                            <th style={{ padding: "0.5rem" }}>Kind</th>
                            <th style={{ padding: "0.5rem" }}>Capacity</th>
                            <th style={{ padding: "0.5rem" }}>Bookable</th>
                            <th style={{ padding: "0.5rem" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zones.map((z) => {
                            const isSelected = z.id === selectedZoneId;
                            return (
                              <tr
                                key={z.id}
                                onClick={() => selectZoneForEdit(z)}
                                style={{
                                  borderBottom: "1px solid #f1f5f9",
                                  backgroundColor: isSelected ? "#f0f9ff" : "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                <td style={{ padding: "0.5rem", fontWeight: 600, color: "#0f172a" }}>{z.name}</td>
                                <td style={{ padding: "0.5rem", textTransform: "capitalize" }}>{z.kind}</td>
                                <td style={{ padding: "0.5rem" }}>{z.capacity} bays</td>
                                <td style={{ padding: "0.5rem" }}>
                                  {z.reservations_enabled ? (
                                    <span
                                      style={{
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: "9999px",
                                        backgroundColor: "#dcfce7",
                                        color: "#166534",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Bookable
                                    </span>
                                  ) : (
                                    <span
                                      title="Set reservation rules to enable bookings"
                                      style={{
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: "9999px",
                                        backgroundColor: "#fef3c7",
                                        color: "#92400e",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        cursor: "help",
                                      }}
                                    >
                                      Not bookable
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "0.5rem" }}>
                                  {z.is_active ? (
                                    <span style={{ color: "#16a34a", fontWeight: 600 }}>Active</span>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>Inactive</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Zone Editor Form */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>
                    {zoneFormMode === "create" ? "Create Infrastructure Zone" : "Edit Zone Details"}
                  </h3>
                  {zoneFormMode === "edit" && (
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>ID: {selectedZoneId}</span>
                  )}
                </div>

                {zoneActionMessage && (
                  <div style={{ padding: "0.6rem", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                    {zoneActionMessage}
                  </div>
                )}

                <form onSubmit={handleSaveZone}>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                      Zone Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={zoneName}
                      onChange={(e) => setZoneName(e.target.value)}
                      placeholder="e.g. Master Canteen Parking"
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                        Zone Kind *
                      </label>
                      <select
                        value={zoneKind}
                        onChange={(e) => setZoneKind(e.target.value as "parking" | "loading" | "mixed")}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      >
                        <option value="parking">Parking</option>
                        <option value="loading">Loading</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                        Active Status
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "36px", fontSize: "0.85rem", color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={zoneActive}
                          onChange={(e) => setZoneActive(e.target.checked)}
                        />
                        Zone is operational
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                        Centroid Latitude *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={zoneLat}
                        onChange={(e) => setZoneLat(e.target.value)}
                        placeholder="20.2644"
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                        Centroid Longitude *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={zoneLon}
                        onChange={(e) => setZoneLon(e.target.value)}
                        placeholder="85.8398"
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                      Boundary Ring Coordinates (Optional JSON: [{`"lat": n, "lon": n`}, ...] closed ring &gt;= 4 points)
                    </label>
                    <textarea
                      rows={2}
                      value={zoneBoundaryStr}
                      onChange={(e) => setZoneBoundaryStr(e.target.value)}
                      placeholder='[{"lat": 20.264, "lon": 85.839}, {"lat": 20.265, "lon": 85.839}, {"lat": 20.265, "lon": 85.841}, {"lat": 20.264, "lon": 85.839}]'
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", fontFamily: "monospace" }}
                    />
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                      Operating Schedule (Optional JSON per File 66)
                    </label>
                    <textarea
                      rows={2}
                      value={zoneScheduleStr}
                      onChange={(e) => setZoneScheduleStr(e.target.value)}
                      placeholder='{"mon": [["08:00", "20:00"]], "tue": [["08:00", "20:00"]]}'
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", fontFamily: "monospace" }}
                    />
                  </div>

                  {/* Crowd Thresholds */}
                  <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.4rem" }}>
                      Crowd Thresholds (Occupancy % &amp; Pedestrians: 0 &lt;= moderate &lt; high &lt; very_high)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.4rem" }}>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Occ % Moderate</label>
                        <input
                          type="number"
                          step="any"
                          value={ctOccModerate}
                          onChange={(e) => setCtOccModerate(e.target.value)}
                          placeholder="e.g. 70"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Occ % High</label>
                        <input
                          type="number"
                          step="any"
                          value={ctOccHigh}
                          onChange={(e) => setCtOccHigh(e.target.value)}
                          placeholder="e.g. 85"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Occ % Very High</label>
                        <input
                          type="number"
                          step="any"
                          value={ctOccVeryHigh}
                          onChange={(e) => setCtOccVeryHigh(e.target.value)}
                          placeholder="e.g. 95"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Ped Moderate</label>
                        <input
                          type="number"
                          step="any"
                          value={ctPedModerate}
                          onChange={(e) => setCtPedModerate(e.target.value)}
                          placeholder="e.g. 50"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Ped High</label>
                        <input
                          type="number"
                          step="any"
                          value={ctPedHigh}
                          onChange={(e) => setCtPedHigh(e.target.value)}
                          placeholder="e.g. 100"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Ped Very High</label>
                        <input
                          type="number"
                          step="any"
                          value={ctPedVeryHigh}
                          onChange={(e) => setCtPedVeryHigh(e.target.value)}
                          placeholder="e.g. 200"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reservation Rules */}
                  <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                        Reservation Rules
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                        (All 4 required positive integers, or empty = Not Bookable)
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Grace (min)</label>
                        <input
                          type="number"
                          value={rrGraceMin}
                          onChange={(e) => setRrGraceMin(e.target.value)}
                          placeholder="-"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Pending TTL (min)</label>
                        <input
                          type="number"
                          value={rrPendingTtlMin}
                          onChange={(e) => setRrPendingTtlMin(e.target.value)}
                          placeholder="-"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Cancel Cutoff (min)</label>
                        <input
                          type="number"
                          value={rrCancelCutoffMin}
                          onChange={(e) => setRrCancelCutoffMin(e.target.value)}
                          placeholder="-"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#64748b" }}>Overstay Grace (min)</label>
                        <input
                          type="number"
                          value={rrOverstayGraceMin}
                          onChange={(e) => setRrOverstayGraceMin(e.target.value)}
                          placeholder="-"
                          style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingZone}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      backgroundColor: savingZone ? "#94a3b8" : "#0284c7",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: savingZone ? "not-allowed" : "pointer",
                    }}
                  >
                    {savingZone ? "Saving Zone..." : zoneFormMode === "create" ? "Create Zone" : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FACILITIES AND BAYS */}
      {currentTab === "Facilities and bays" && (
        <div>
          {/* Zone Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0.75rem 1rem",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              marginBottom: "1.25rem",
            }}
          >
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
              Select Zone:
            </label>
            <select
              value={facZoneId}
              onChange={(e) => {
                setFacZoneId(e.target.value);
                loadFacilities(e.target.value);
              }}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                minWidth: "260px",
              }}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.kind})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Facilities Panel */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>Facilities</h3>
                <button
                  onClick={() => {
                    setFacFormMode("create");
                    setSelectedFacilityId("");
                    setFacName("");
                    setFacAddress("");
                    setFacLat("");
                    setFacLon("");
                  }}
                  style={{
                    padding: "0.3rem 0.6rem",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add Facility
                </button>
              </div>

              {facilitiesLoading ? (
                <div style={{ padding: "1rem", color: "#64748b", textAlign: "center" }}>Loading facilities...</div>
              ) : facilitiesError ? (
                <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "4px", fontSize: "0.85rem" }}>
                  {facilitiesError}
                </div>
              ) : facilities.length === 0 ? (
                <div style={{ padding: "1.5rem", color: "#64748b", textAlign: "center" }}>No facilities in this zone.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {facilities.map((fac) => {
                    const isSelected = fac.id === selectedFacilityId;
                    return (
                      <div
                        key={fac.id}
                        onClick={() => {
                          setSelectedFacilityId(fac.id);
                          setFacFormMode("edit");
                          setFacName(fac.name);
                          setFacKind(fac.kind);
                          setFacLat(String(fac.location.lat));
                          setFacLon(String(fac.location.lon));
                          setFacSupportsRes(fac.supports_reservation);
                          setFacAddress(fac.address ?? "");
                        }}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "6px",
                          border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                          backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>{fac.name}</span>
                          <span style={{ fontSize: "0.75rem", textTransform: "capitalize", color: "#64748b" }}>{fac.kind}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
                          Address: {fac.address ?? "-"} | Fee:{" "}
                          {fac.fee ? `${fac.fee.currency} ${fac.fee.rate_per_hour}/hr (${fac.fee.bay_type})` : "-"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Facility Form */}
              <form onSubmit={handleSaveFacility} style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
                  {facFormMode === "create" ? "Add Facility" : "Edit Selected Facility"}
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#334155" }}>Facility Name *</label>
                  <input
                    type="text"
                    required
                    value={facName}
                    onChange={(e) => setFacName(e.target.value)}
                    placeholder="e.g. Master Canteen Surface Parking"
                    style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#334155" }}>Kind</label>
                    <select
                      value={facKind}
                      onChange={(e) => setFacKind(e.target.value as "facility" | "roadside")}
                      style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    >
                      <option value="facility">Facility</option>
                      <option value="roadside">Roadside</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#334155" }}>Reservations</label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", height: "30px", fontSize: "0.75rem", color: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={facSupportsRes}
                        onChange={(e) => setFacSupportsRes(e.target.checked)}
                      />
                      Supports Bookings
                    </label>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#334155" }}>Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={facLat}
                      onChange={(e) => setFacLat(e.target.value)}
                      placeholder="20.2644"
                      style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#334155" }}>Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={facLon}
                      onChange={(e) => setFacLon(e.target.value)}
                      placeholder="85.8398"
                      style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#334155" }}>Address (optional)</label>
                  <input
                    type="text"
                    value={facAddress}
                    onChange={(e) => setFacAddress(e.target.value)}
                    placeholder="Physical address"
                    style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingFac}
                  style={{
                    padding: "0.4rem 0.8rem",
                    backgroundColor: savingFac ? "#94a3b8" : "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: savingFac ? "not-allowed" : "pointer",
                  }}
                >
                  {savingFac ? "Saving..." : facFormMode === "create" ? "Add Facility" : "Update Facility"}
                </button>
              </form>
            </div>

            {/* Bays Panel */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>Bays in Facility</h3>
                {selectedFacilityId && (
                  <button
                    onClick={() => {
                      setBayFormMode("create");
                      setSelectedBayId("");
                      setBayCode("");
                      setBayLat("");
                      setBayLon("");
                      setBayOutOfService(false);
                      setBayType("regular");
                      setBayCategories(["car"]);
                    }}
                    style={{
                      padding: "0.3rem 0.6rem",
                      backgroundColor: "#0284c7",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Add Bay
                  </button>
                )}
              </div>

              {!selectedFacilityId ? (
                <div style={{ padding: "1.5rem", color: "#64748b", textAlign: "center" }}>
                  Please select a facility from the left column to view or manage its bays.
                </div>
              ) : baysLoading ? (
                <div style={{ padding: "1rem", color: "#64748b", textAlign: "center" }}>Loading bays...</div>
              ) : baysError ? (
                <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "4px", fontSize: "0.85rem" }}>
                  {baysError}
                </div>
              ) : bays.length === 0 ? (
                <div style={{ padding: "1.5rem", color: "#64748b", textAlign: "center" }}>No bays configured in this facility.</div>
              ) : (
                <div style={{ overflowX: "auto", maxHeight: "240px", overflowY: "auto", marginBottom: "1rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f1f5f9", textAlign: "left", color: "#64748b" }}>
                        <th style={{ padding: "0.4rem" }}>Code</th>
                        <th style={{ padding: "0.4rem" }}>Type</th>
                        <th style={{ padding: "0.4rem" }}>Vehicles</th>
                        <th style={{ padding: "0.4rem" }}>Telemetry</th>
                        <th style={{ padding: "0.4rem" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bays.map(({ bay, status }) => {
                        const isSelected = bay.id === selectedBayId;
                        return (
                          <tr
                            key={bay.id}
                            onClick={() => {
                              setSelectedBayId(bay.id);
                              setBayFormMode("edit");
                              setBayCode(bay.code);
                              setBayType(bay.bay_type);
                              setBayLat(String(bay.location.lat));
                              setBayLon(String(bay.location.lon));
                              setBayCategories(bay.permitted_vehicle_categories);
                              setBayOutOfService(bay.out_of_service);
                            }}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              backgroundColor: isSelected ? "#f0f9ff" : "transparent",
                              cursor: "pointer",
                            }}
                          >
                            <td style={{ padding: "0.4rem", fontWeight: 600 }}>{bay.code}</td>
                            <td style={{ padding: "0.4rem", textTransform: "capitalize" }}>{bay.bay_type}</td>
                            <td style={{ padding: "0.4rem" }}>{bay.permitted_vehicle_categories.join(", ")}</td>
                            <td style={{ padding: "0.4rem" }}>
                              <DataBadge
                                dataState={status.data_state}
                                provenance={status.provenance}
                                observedAt={status.observed_at}
                                compact
                              />
                            </td>
                            <td style={{ padding: "0.4rem" }}>
                              {bay.out_of_service ? (
                                <span style={{ color: "#ef4444", fontWeight: 600 }}>Out of Service</span>
                              ) : (
                                <span style={{ color: "#16a34a" }}>In Service</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bay Form */}
              {selectedFacilityId && (
                <form onSubmit={handleSaveBay} style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
                    {bayFormMode === "create" ? "Add Bay to Facility" : "Edit Selected Bay"}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#334155" }}>Bay Code *</label>
                      <input
                        type="text"
                        required
                        value={bayCode}
                        onChange={(e) => setBayCode(e.target.value)}
                        placeholder="e.g. A01"
                        style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#334155" }}>Bay Type</label>
                      <select
                        value={bayType}
                        onChange={(e) => setBayType(e.target.value as BayType)}
                        style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                      >
                        <option value="regular">Regular</option>
                        {/* Bay type loading is only selectable when zone kind is loading or mixed */}
                        {(() => {
                          const currentZone = zones.find((z) => z.id === facZoneId);
                          const canHaveLoading = currentZone && (currentZone.kind === "loading" || currentZone.kind === "mixed");
                          return canHaveLoading ? (
                            <option value="loading">Loading</option>
                          ) : null;
                        })()}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#334155" }}>Latitude *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={bayLat}
                        onChange={(e) => setBayLat(e.target.value)}
                        placeholder="20.2645"
                        style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#334155" }}>Longitude *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={bayLon}
                        onChange={(e) => setBayLon(e.target.value)}
                        placeholder="85.8397"
                        style={{ width: "100%", padding: "0.35rem", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                      />
                    </div>
                  </div>

                  {/* Permitted categories */}
                  <div style={{ marginBottom: "0.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#334155", marginBottom: "0.2rem" }}>
                      Permitted Vehicle Categories:
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {VEHICLE_CATEGORIES.map((cat) => {
                        const checked = bayCategories.includes(cat);
                        return (
                          <label key={cat} style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBayCategories([...bayCategories, cat]);
                                } else {
                                  if (bayCategories.length > 1) {
                                    setBayCategories(bayCategories.filter((c) => c !== cat));
                                  }
                                }
                              }}
                            />
                            {cat}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Out of service */}
                  <div
                    style={{
                      padding: "0.5rem",
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: "4px",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "#92400e", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={bayOutOfService}
                        onChange={(e) => setBayOutOfService(e.target.checked)}
                      />
                      Mark Bay as Out of Service
                    </label>
                    <div style={{ fontSize: "0.7rem", color: "#78350f", marginTop: "0.2rem" }}>
                      Notice: Setting out of service reduces zone capacity immediately (capacity is computed from in-service bays).
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingBay}
                    style={{
                      padding: "0.4rem 0.8rem",
                      backgroundColor: savingBay ? "#94a3b8" : "#0284c7",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: savingBay ? "not-allowed" : "pointer",
                    }}
                  >
                    {savingBay ? "Saving Bay..." : bayFormMode === "create" ? "Add Bay" : "Update Bay"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FEES */}
      {currentTab === "Fees" && (
        <div style={{ maxWidth: "800px" }}>
          {/* Informational Notice */}
          <div
            style={{
              padding: "0.85rem 1rem",
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "8px",
              color: "#0369a1",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontWeight: 700 }}>Notice:</span>
            <span>Fees are informational only; payment gateways are not enabled in this prototype.</span>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "#1e293b" }}>
              Configure Facility Fee Schedule
            </h3>

            {feeSuccessMessage && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                {feeSuccessMessage}
              </div>
            )}
            {feeError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                {feeError}
              </div>
            )}

            <form onSubmit={handleSaveFee}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                  Select Zone
                </label>
                <select
                  value={feeFacZoneId}
                  onChange={(e) => {
                    setFeeFacZoneId(e.target.value);
                    loadFeeFacilities(e.target.value);
                  }}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                  Select Facility *
                </label>
                <select
                  value={selectedFeeFacId}
                  onChange={(e) => setSelectedFeeFacId(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                >
                  {feeFacList.length === 0 ? (
                    <option value="">No facilities available</option>
                  ) : (
                    feeFacList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.kind}) - Current Fee: {f.fee ? `${f.fee.currency} ${f.fee.rate_per_hour}/hr` : "-"}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Bay Type *
                  </label>
                  <select
                    value={feeBayType}
                    onChange={(e) => setFeeBayType(e.target.value as BayType)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  >
                    <option value="regular">Regular</option>
                    <option value="loading">Loading</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Rate Per Hour * (at most 2 decimals)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={feeRatePerHour}
                    onChange={(e) => setFeeRatePerHour(e.target.value)}
                    placeholder="e.g. 25.00"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Currency
                  </label>
                  <input
                    type="text"
                    value={feeCurrency}
                    onChange={(e) => setFeeCurrency(e.target.value)}
                    placeholder="INR"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Effective From
                  </label>
                  <input
                    type="datetime-local"
                    value={feeEffectiveFrom}
                    onChange={(e) => setFeeEffectiveFrom(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Effective To (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={feeEffectiveTo}
                    onChange={(e) => setFeeEffectiveTo(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingFee || !selectedFeeFacId}
                style={{
                  padding: "0.6rem 1.25rem",
                  backgroundColor: savingFee || !selectedFeeFacId ? "#94a3b8" : "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: savingFee || !selectedFeeFacId ? "not-allowed" : "pointer",
                }}
              >
                {savingFee ? "Saving Fee..." : "Save Fee Schedule"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: ACCOUNTS */}
      {currentTab === "Accounts" && (
        <div>
          {/* Status filter bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["all", "pending", "approved", "suspended"].map((st) => (
                <button
                  key={st}
                  onClick={() => setAccountStatusFilter(st)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "9999px",
                    border: "none",
                    backgroundColor: accountStatusFilter === st ? "#0284c7" : "#f1f5f9",
                    color: accountStatusFilter === st ? "#ffffff" : "#475569",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {!isSystemAdmin && (
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Municipal Admin view: scoped to business operators only
              </span>
            )}
          </div>

          {accountsLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading accounts...</div>
          ) : accountsError ? (
            <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem" }}>
              {accountsError}
            </div>
          ) : accounts.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                color: "#64748b",
              }}
            >
              No accounts found matching filter.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                overflowX: "auto",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                marginBottom: "1.5rem",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "0.75rem" }}>Full Name</th>
                    <th style={{ padding: "0.75rem" }}>Email</th>
                    <th style={{ padding: "0.75rem" }}>Phone</th>
                    <th style={{ padding: "0.75rem" }}>Roles</th>
                    <th style={{ padding: "0.75rem" }}>Status</th>
                    <th style={{ padding: "0.75rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((user) => {
                    const isPending = user.status === "pending";
                    const isSuspended = user.status === "suspended";
                    const isActioning = actionUserId === user.id;

                    return (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 600, color: "#0f172a" }}>{user.full_name}</td>
                        <td style={{ padding: "0.75rem" }}>{user.email}</td>
                        <td style={{ padding: "0.75rem" }}>{user.phone ?? "-"}</td>
                        <td style={{ padding: "0.75rem" }}>
                          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
                            {user.roles.map((r) => (
                              <span
                                key={r}
                                style={{
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  backgroundColor: "#f1f5f9",
                                  color: "#334155",
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                              >
                                {r}
                                {/* Revoke role button (system_admin only) */}
                                {isSystemAdmin && (
                                  <button
                                    onClick={() => handleRevokeRole(user, r)}
                                    title={`Revoke role ${r}`}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      padding: 0,
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <span
                            style={{
                              padding: "0.2rem 0.5rem",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "capitalize",
                              backgroundColor:
                                user.status === "approved"
                                  ? "#dcfce7"
                                  : user.status === "pending"
                                  ? "#fef3c7"
                                  : "#fee2e2",
                              color:
                                user.status === "approved"
                                  ? "#166534"
                                  : user.status === "pending"
                                  ? "#92400e"
                                  : "#991b1b",
                            }}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            {isPending && (
                              <button
                                disabled={isActioning}
                                onClick={() => handleSetUserStatus(user, "approved")}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  backgroundColor: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: isActioning ? "not-allowed" : "pointer",
                                }}
                              >
                                Approve
                              </button>
                            )}
                            {isSuspended ? (
                              <button
                                disabled={isActioning}
                                onClick={() => handleSetUserStatus(user, "approved")}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  backgroundColor: "#0284c7",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: isActioning ? "not-allowed" : "pointer",
                                }}
                              >
                                Re-activate
                              </button>
                            ) : (
                              <button
                                disabled={isActioning}
                                onClick={() => handleSetUserStatus(user, "suspended")}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  backgroundColor: "#dc2626",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: isActioning ? "not-allowed" : "pointer",
                                }}
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Role Grant Form (system_admin only) */}
          {isSystemAdmin && (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                maxWidth: "600px",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#1e293b" }}>
                Grant Role to Account (System Admin Only)
              </h3>
              <p style={{ margin: "0 0 1rem 0", fontSize: "0.8rem", color: "#64748b" }}>
                Privileged roles are granted explicitly by a system administrator.
              </p>
              <form onSubmit={handleGrantRole} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#334155", marginBottom: "0.2rem" }}>
                    Select User
                  </label>
                  <select
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                  >
                    <option value="">-- Choose Account --</option>
                    {accounts.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: "160px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#334155", marginBottom: "0.2rem" }}>
                    Role
                  </label>
                  <select
                    value={grantRole}
                    onChange={(e) => setGrantRole(e.target.value as Role)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={grantingRole || !grantUserId}
                  style={{
                    padding: "0.45rem 1rem",
                    backgroundColor: grantingRole || !grantUserId ? "#94a3b8" : "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: grantingRole || !grantUserId ? "not-allowed" : "pointer",
                  }}
                >
                  {grantingRole ? "Granting..." : "Grant Role"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BUSINESSES */}
      {currentTab === "Businesses" && (
        <div>
          {/* Status filter bar */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {["all", "pending", "approved", "suspended"].map((st) => (
              <button
                key={st}
                onClick={() => setBizStatusFilter(st)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "9999px",
                  border: "none",
                  backgroundColor: bizStatusFilter === st ? "#0284c7" : "#f1f5f9",
                  color: bizStatusFilter === st ? "#ffffff" : "#475569",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {businessesLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading businesses...</div>
          ) : businessesError ? (
            <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px" }}>
              {businessesError}
            </div>
          ) : businesses.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                color: "#64748b",
              }}
            >
              No businesses found matching status filter.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                overflowX: "auto",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "0.75rem" }}>Business Name</th>
                    <th style={{ padding: "0.75rem" }}>Registration No</th>
                    <th style={{ padding: "0.75rem" }}>Owner Email</th>
                    <th style={{ padding: "0.75rem" }}>Registered</th>
                    <th style={{ padding: "0.75rem" }}>Status</th>
                    <th style={{ padding: "0.75rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((biz) => {
                    const isPending = biz.status === "pending";
                    const isSuspended = biz.status === "suspended";
                    const isActioning = actionBizId === biz.id;

                    return (
                      <tr key={biz.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 600, color: "#0f172a" }}>{biz.name}</td>
                        <td style={{ padding: "0.75rem" }}>{biz.registration_no ?? "-"}</td>
                        <td style={{ padding: "0.75rem" }}>{biz.owner_email ?? "-"}</td>
                        <td style={{ padding: "0.75rem", color: "#64748b" }}>
                          {biz.created_at ? new Date(biz.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <span
                            style={{
                              padding: "0.2rem 0.5rem",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "capitalize",
                              backgroundColor:
                                biz.status === "approved"
                                  ? "#dcfce7"
                                  : biz.status === "pending"
                                  ? "#fef3c7"
                                  : "#fee2e2",
                              color:
                                biz.status === "approved"
                                  ? "#166534"
                                  : biz.status === "pending"
                                  ? "#92400e"
                                  : "#991b1b",
                            }}
                          >
                            {biz.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            {isPending && (
                              <button
                                disabled={isActioning}
                                onClick={() => handleSetBusinessStatus(biz, "approved")}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  backgroundColor: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: isActioning ? "not-allowed" : "pointer",
                                }}
                              >
                                Approve
                              </button>
                            )}
                            {isSuspended ? (
                              <button
                                disabled={isActioning}
                                onClick={() => handleSetBusinessStatus(biz, "approved")}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  backgroundColor: "#0284c7",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: isActioning ? "not-allowed" : "pointer",
                                }}
                              >
                                Re-activate
                              </button>
                            ) : (
                              <button
                                disabled={isActioning}
                                onClick={() => handleSetBusinessStatus(biz, "suspended")}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  backgroundColor: "#dc2626",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: isActioning ? "not-allowed" : "pointer",
                                }}
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: MODELS */}
      {currentTab === "Models" && (
        <div>
          {promoteError && (
            <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
              {promoteError}
            </div>
          )}

          {modelsLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading forecast models...</div>
          ) : modelsError ? (
            <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px" }}>
              {modelsError}
            </div>
          ) : models.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#64748b" }}>
              No forecast models found.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1rem" }}>
              {models.map((mod) => {
                const isCandidate = mod.status === "candidate";
                const isActive = mod.status === "active";

                return (
                  <div
                    key={mod.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: isActive ? "2px solid #16a34a" : "1px solid #e2e8f0",
                      padding: "1rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>{mod.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>v{mod.version} ({mod.kind})</div>
                        </div>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            backgroundColor:
                              mod.status === "active"
                                ? "#dcfce7"
                                : mod.status === "candidate"
                                ? "#e0f2fe"
                                : "#f1f5f9",
                            color:
                              mod.status === "active"
                                ? "#166534"
                                : mod.status === "candidate"
                                ? "#0369a1"
                                : "#64748b",
                          }}
                        >
                          {mod.status}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "#334155", margin: "0.5rem 0" }}>
                        <div>Target: <strong>{mod.target}</strong></div>
                        <div>Training Provenance: <strong>{mod.trained_on}</strong></div>
                        <div>Trained At: {mod.trained_at ? new Date(mod.trained_at).toLocaleString() : "-"}</div>
                      </div>

                      {/* Metrics display */}
                      <div style={{ padding: "0.5rem", backgroundColor: "#f8fafc", borderRadius: "4px", fontSize: "0.75rem", color: "#475569", marginBottom: "0.75rem" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Evaluation Metrics:</div>
                        {Object.entries(mod.metrics).map(([k, v]) => (
                          <span key={k} style={{ marginRight: "0.75rem" }}>
                            {k}: <strong>{typeof v === "number" ? v : String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      {isCandidate && (
                        <button
                          onClick={() => setPromoteCandidateModel(mod)}
                          style={{
                            width: "100%",
                            padding: "0.45rem",
                            backgroundColor: "#0284c7",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Promote to Active
                        </button>
                      )}
                      {isActive && (
                        <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#166534", fontWeight: 600, padding: "0.3rem" }}>
                          ✓ Currently Serving Active Forecasts
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Model Promotion Confirmation Modal */}
          {promoteCandidateModel && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  maxWidth: "500px",
                  width: "100%",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
              >
                <h3 style={{ margin: "0 0 0.75rem 0", color: "#0f172a" }}>
                  Confirm Model Promotion
                </h3>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#334155", lineHeight: 1.5 }}>
                  Are you sure you want to promote candidate model{" "}
                  <strong>{promoteCandidateModel.name} (v{promoteCandidateModel.version})</strong> for target{" "}
                  <strong>{promoteCandidateModel.target}</strong>?
                </p>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#fef3c7",
                    borderRadius: "6px",
                    border: "1px solid #fde68a",
                    fontSize: "0.8rem",
                    color: "#92400e",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <strong>Training Provenance:</strong> {promoteCandidateModel.trained_on}
                  </div>
                  <div style={{ marginTop: "0.2rem" }}>
                    Promoting will automatically retire the currently active model for target "{promoteCandidateModel.target}".
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    disabled={promotingModel}
                    onClick={() => setPromoteCandidateModel(null)}
                    style={{
                      padding: "0.45rem 1rem",
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={promotingModel}
                    onClick={handleConfirmPromoteModel}
                    style={{
                      padding: "0.45rem 1.1rem",
                      backgroundColor: promotingModel ? "#94a3b8" : "#0284c7",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: promotingModel ? "not-allowed" : "pointer",
                    }}
                  >
                    {promotingModel ? "Promoting..." : "Confirm & Promote"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: AUDIT */}
      {currentTab === "Audit" && (
        <div>
          {/* Filters Bar */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              marginBottom: "1rem",
              backgroundColor: "#ffffff",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>Entity:</label>
              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                style={{ padding: "0.35rem 0.6rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
              >
                <option value="all">All Entities</option>
                <option value="zone">Zone</option>
                <option value="facility">Facility</option>
                <option value="bay">Bay</option>
                <option value="fee">Fee</option>
                <option value="user">User</option>
                <option value="business">Business</option>
                <option value="model">Model</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>Action:</label>
              <input
                type="text"
                value={auditActionQuery}
                onChange={(e) => setAuditActionQuery(e.target.value)}
                placeholder="Search action name..."
                style={{ flex: 1, padding: "0.35rem 0.6rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
              />
            </div>

            <button
              onClick={loadAuditLogs}
              style={{
                padding: "0.35rem 0.75rem",
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Filter
            </button>
          </div>

          {auditLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading audit records...</div>
          ) : auditError ? (
            <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px" }}>
              {auditError}
            </div>
          ) : auditLogs.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                color: "#64748b",
              }}
            >
              No audit logs recorded matching criteria.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                overflowX: "auto",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "0.6rem" }}>Timestamp</th>
                    <th style={{ padding: "0.6rem" }}>Actor ID</th>
                    <th style={{ padding: "0.6rem" }}>Action</th>
                    <th style={{ padding: "0.6rem" }}>Entity</th>
                    <th style={{ padding: "0.6rem" }}>Entity ID</th>
                    <th style={{ padding: "0.6rem" }}>Before</th>
                    <th style={{ padding: "0.6rem" }}>After</th>
                    <th style={{ padding: "0.6rem" }}>Request ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.6rem", whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: "0.6rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                        {log.actor_user_id ?? "-"}
                      </td>
                      <td style={{ padding: "0.6rem", fontWeight: 600 }}>{log.action}</td>
                      <td style={{ padding: "0.6rem", textTransform: "capitalize" }}>{log.entity_type}</td>
                      <td style={{ padding: "0.6rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                        {log.entity_id ?? "-"}
                      </td>
                      <td style={{ padding: "0.6rem", fontFamily: "monospace", fontSize: "0.7rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.before ? JSON.stringify(log.before) : "-"}
                      </td>
                      <td style={{ padding: "0.6rem", fontFamily: "monospace", fontSize: "0.7rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.after ? JSON.stringify(log.after) : "-"}
                      </td>
                      <td style={{ padding: "0.6rem", fontFamily: "monospace", fontSize: "0.7rem" }}>
                        {log.request_id ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "1.5rem",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#0f172a" }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.875rem", color: "#475569", lineHeight: 1.5 }}>
              {confirmModal.description}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                style={{
                  padding: "0.45rem 1rem",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                style={{
                  padding: "0.45rem 1rem",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
