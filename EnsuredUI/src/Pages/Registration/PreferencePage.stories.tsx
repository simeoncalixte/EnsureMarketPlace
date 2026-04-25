import React from "react";
import { Meta, Story } from "@storybook/react";
import PreferencePage from "./PreferencePage";

export default {
  title: "Pages/Registration/Preference",
  component: PreferencePage,
} as Meta;

const Template: Story = () => <PreferencePage />;

export const Default = Template.bind({});
