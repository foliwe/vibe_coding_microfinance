"use client";

import { useEffect, useState } from "react";

import {
  buildWorkstationDeviceName,
} from "../lib/staff-device-shared";

type WorkstationIdentity = {
  name: string;
};

function ensureWorkstationIdentity() {
  const deviceName = buildWorkstationDeviceName({
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  });

  return {
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
    name: "",
  });

  useEffect(() => {
    setIdentity(ensureWorkstationIdentity());
  }, []);

  return (
    <>
      <input name="staffDeviceName" readOnly type="hidden" value={identity.name} />
    </>
  );
}
