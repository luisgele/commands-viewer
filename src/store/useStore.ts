// Legacy re-export — components still importing from here will work.
// TODO: migrate components to import directly from the module store.
export {
  useCommandsStore as useStore,
  type CommandsState as StoreState,
  type Density,
} from "../modules/commands/store/useCommandsStore";

