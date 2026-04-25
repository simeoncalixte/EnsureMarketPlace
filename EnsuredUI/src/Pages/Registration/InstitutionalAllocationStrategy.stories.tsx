import React from "react";
import { Meta, Story } from "@storybook/react";
import InstitutionalAllocationStrategy from "./InstitutionalAllocationStrategy";

export default {
  title: "Pages/Registration/Institutional Allocation Strategy",
  component: InstitutionalAllocationStrategy,
} as Meta;

const Template: Story = () => <InstitutionalAllocationStrategy />;

export const Default = Template.bind({});
