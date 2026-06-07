import { toast } from "sonner";

export function notify(msg: string, isError = false) {
  if (isError) toast.error(msg);
  else toast.success(msg);
}
