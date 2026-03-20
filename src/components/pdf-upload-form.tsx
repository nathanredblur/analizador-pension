import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, Lock, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExtractionError, extractFromPdf } from "@/lib/pdf-extractor";
import type { CotizacionRecord } from "@/lib/normativa";
import type { UserData } from "@/components/dashboard/types";

interface PdfUploadFormProps {
  onSuccess: (records: CotizacionRecord[], userData: UserData) => void;
}

export function PdfUploadForm({ onSuccess }: PdfUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [fechaNac, setFechaNac] = useState("");
  const [sexo, setSexo] = useState<"M" | "F">("M");
  const [nHijos, setNHijos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [needsFechaNac, setNeedsFechaNac] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo se aceptan archivos PDF.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { records, personalData } = await extractFromPdf(file, password);

      const nombre = personalData.nombre ?? "";
      const extractedFechaNac = personalData.fecha_nac ?? null;

      if (!extractedFechaNac && !fechaNac) {
        setNeedsFechaNac(true);
        setLoading(false);
        return;
      }

      onSuccess(records, {
        nombre,
        fecha_nac: extractedFechaNac ?? fechaNac,
        sexo,
        n_hijos: nHijos,
      });
    } catch (err) {
      if (err instanceof ExtractionError) {
        setError(err.message);
      } else {
        setError("Error inesperado al procesar el PDF.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-xl">
          Sube tu reporte de Colpensiones
        </CardTitle>
        <CardDescription>
          Descarga el PDF desde Mi Colpensiones &rarr; Historial de
          cotizaciones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          <div
            className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-primary/50 bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {file ? (
              <>
                <FileText className="size-8 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  Click para cambiar archivo
                </span>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Arrastra tu PDF aquí
                </span>
                <span className="text-xs text-muted-foreground">
                  o haz clic para seleccionar
                </span>
              </>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              <Lock className="mr-1 inline size-3.5" />
              Contraseña del PDF
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Tu cédula (ej: 12345678)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Fecha nacimiento fallback */}
          {needsFechaNac && (
            <div className="space-y-2">
              <Label htmlFor="fecha-nac">Fecha de nacimiento</Label>
              <p className="text-xs text-muted-foreground">
                No se pudo extraer del PDF. Ingrésala manualmente.
              </p>
              <Input
                id="fecha-nac"
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={fechaNac}
                onChange={(e) => setFechaNac(e.target.value)}
              />
            </div>
          )}

          {/* Sexo + Hijos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sexo</Label>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant={sexo === "M" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSexo("M")}
                >
                  Hombre
                </Button>
                <Button
                  type="button"
                  variant={sexo === "F" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSexo("F")}
                >
                  Mujer
                </Button>
              </div>
            </div>

            {sexo === "F" && (
              <div className="space-y-2">
                <Label htmlFor="hijos">Número de hijos</Label>
                <Input
                  id="hijos"
                  type="number"
                  min={0}
                  max={10}
                  value={nHijos}
                  onChange={(e) => setNHijos(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Escenario Ley 2381 (suspendida): descuento de 50 semanas por hijo (máx. 3)
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Procesando...
              </>
            ) : needsFechaNac ? (
              "Continuar"
            ) : (
              "Analizar mi pensión"
            )}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Todo se procesa localmente — ningún dato sale de tu computador
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
