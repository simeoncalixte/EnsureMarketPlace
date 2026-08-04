import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import DashboardToolbar from "./DashboardToolbar";

export default {
  title: "Dashboards/DashboardToolbar",
  component: DashboardToolbar,
} as Meta<typeof DashboardToolbar>;

const Template: StoryFn<typeof DashboardToolbar> = (args) => <DashboardToolbar {...args} />;

export const Default = Template.bind({});
Default.args = {
  editing: false,
  isAdmin: false,
  scope: "user",
  showAdd: false,
  addableCount: 3,
  error: null,
  busy: false,
  sourceLabel: "Your layout",
  beginEdit: () => undefined,
  // Storybook no-op setter
  setShowAdd: (() => {}) as React.Dispatch<React.SetStateAction<boolean>>,
  reset: () => undefined,
  cancelEdit: () => undefined,
  save: () => undefined,
};

export const EditingAdmin = Template.bind({});
EditingAdmin.args = {
  ...Default.args,
  editing: true,
  isAdmin: true,
  scope: "org",
  showAdd: true,
  addableCount: 1,
  sourceLabel: "Organization default",
};
