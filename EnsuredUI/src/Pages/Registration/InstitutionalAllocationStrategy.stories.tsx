import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import InstitutionalAllocationStrategy from "./InstitutionalAllocationStrategy";

export default {
  title: "Pages/Registration/Institutional Allocation Strategy",
  component: InstitutionalAllocationStrategy,
} as Meta;

const Template: StoryFn = () => <InstitutionalAllocationStrategy />;

export const Default = Template.bind({});
