import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import InsurerMGAProfile from "./InsurerMGAProfile";

const meta: Meta = {
  title: "Pages/Registration/InsurerMGAProfile",
  component: InsurerMGAProfile,
};

export default meta;

const Template: StoryFn = () => <InsurerMGAProfile />;

export const Default = Template.bind({});
Default.storyName = "Default View";
