import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import PreferencePage from "./PreferencePage";

export default {
  title: "Pages/Registration/Preference",
  component: PreferencePage,
} as Meta;

const Template: StoryFn = () => <PreferencePage />;

export const Default = Template.bind({});
