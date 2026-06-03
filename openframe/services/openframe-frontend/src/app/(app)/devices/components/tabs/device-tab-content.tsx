'use client';

import { TabContent } from '@flamingo-stack/openframe-frontend-core';
import React from 'react';
import { getTabComponent } from './device-tabs';

interface DeviceTabContentProps {
  activeTab: string;
  device: any;
}

export function DeviceTabContent({ activeTab, device }: DeviceTabContentProps) {
  const TabComponent = getTabComponent(activeTab);

  return <TabContent activeTab={activeTab} TabComponent={TabComponent} componentProps={{ device }} />;
}
