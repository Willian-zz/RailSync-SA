import { Situacao } from "@/components/situacao";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Bloco de detalhes da linha, também usado dentro dos detalhes de uma rota.
export function LinhasTrens({ linha }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trem</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Horários diários</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linha.trens.map((trem) => {
            const horarios = linha.horarios.filter(
              (horario) => horario.trem_id === trem.id,
            );

            return (
              <TableRow key={trem.id}>
                <TableCell className="font-medium">{trem.prefixo}</TableCell>
                <TableCell>
                  <Situacao valor={trem.situacao} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {horarios.map((horario) => (
                      <span
                        key={horario.id}
                        className="rounded-full bg-muted px-2 py-1 text-xs tabular-nums"
                      >
                        {horario.horario}
                      </span>
                    ))}
                    {!horarios.length && "----"}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {!linha.trens.length && (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                Nenhum trem atribuído.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
