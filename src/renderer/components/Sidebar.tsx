import { BrowserTab } from "./BrowserTab";
import { Card } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export const Sidebar = () => {
  return <Card className="p-2 min-w-64">
    <Tabs defaultValue="account" orientation="vertical">
      <TabsList className="w-full">
        <TabsTrigger value="account"><BrowserTab /></TabsTrigger>
        <TabsTrigger value="password"><BrowserTab /></TabsTrigger>
        <TabsTrigger value="notifications"><BrowserTab /></TabsTrigger>
      </TabsList>
    </Tabs>
  </Card>;
};
