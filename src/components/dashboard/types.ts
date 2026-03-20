import type { CotizacionRecord } from "@/lib/normativa";
import type { Ley } from "@/lib/constants";

export interface UserData {
  nombre: string;
  fecha_nac: string;
  sexo: "M" | "F";
  n_hijos: number;
}

export interface DashboardProps {
  records: CotizacionRecord[];
  userData: UserData;
  onExit: () => void;
  onShowInfo: () => void;
}

export interface SectionProps {
  records: CotizacionRecord[];
  userData: UserData;
  ley: Ley;
}
