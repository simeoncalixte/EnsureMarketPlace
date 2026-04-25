import React from "react";
import { Meta, Story } from "@storybook/react";
import InsurerMGAProfile from "./InsurerMGAProfile";

const meta: Meta = {
  title: "Pages/Registration/InsurerMGAProfile",
  component: InsurerMGAProfile,
};

export default meta;

const Template: Story = () => <InsurerMGAProfile />;

export const Default = Template.bind({});
Default.storyName = "Default View";
