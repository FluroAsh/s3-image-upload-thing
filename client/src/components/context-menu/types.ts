export type CommandVariant = "default" | "destructive" | "primary";

export type Command = {
  // id
  // icon
  label: string;
  // variant
  // isAvailable // If the command is available (eg. can't download a folder)
  // execute // callback to execute the command
};
