"use client";

import { useEffect, useState } from "react";

import {
  buildWorkstationDeviceName,
  createWorkstationDeviceId,
  STAFF_DEVICE_COOKIE,
  STAFF_DEVICE_NAME_COOKIE,
  WORKSTATION_DEVICE_ID_STORAGE_KEY,
} from "../lib/staff-device-shared";

type WorkstationIdentity = {
  id: string;
  name: string;
};

function persistCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function ensureWorkstationIdentity() {
  const existingId = window.localStorage.getItem(WORKSTATION_DEVICE_ID_STORAGE_KEY)?.trim();
  const deviceId = existingId || createWorkstationDeviceId();

  if (!existingId) {
    window.localStorage.setItem(WORKSTATION_DEVICE_ID_STORAGE_KEY, deviceId);
  }

  const deviceName = buildWorkstationDeviceName({
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  });

  persistCookie(STAFF_DEVICE_COOKIE, deviceId);
  persistCookie(STAFF_DEVICE_NAME_COOKIE, deviceName);

  return {
    id: deviceId,
    name: deviceName,
  } satisfies WorkstationIdentity;
}

export function WorkstationIdentityBootstrap() {
  useEffect(() => {
    ensureWorkstationIdentity();
  }, []);

  return null;
}

export function WorkstationIdentityFields() {
  const [identity, setIdentity] = useState<WorkstationIdentity>({
    id: "",
    name: "",
  });

  useEffect(() => {
    setIdentity(ensureWorkstationIdentity());
  }, []);

  return (
    <>
      <input name="staffDeviceId" readOnly type="hidden" value={identity.id} />
      <input name="staffDeviceName" readOnly type="hidden" value={identity.name} />
    </>
  );
}
