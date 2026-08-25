"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatus = exports.PeriodoVisita = exports.VisitStatus = void 0;
var VisitStatus;
(function (VisitStatus) {
    VisitStatus["AGENDADA"] = "AGENDADA";
    VisitStatus["EM_ROTA"] = "EM_ROTA";
    VisitStatus["EM_ANDAMENTO"] = "EM_ANDAMENTO";
    VisitStatus["AGUARDANDO_PECA"] = "AGUARDANDO_PECA";
    VisitStatus["CONCLUIDA"] = "CONCLUIDA";
    VisitStatus["CANCELADA"] = "CANCELADA";
})(VisitStatus || (exports.VisitStatus = VisitStatus = {}));
var PeriodoVisita;
(function (PeriodoVisita) {
    PeriodoVisita["MANHA"] = "MANHA";
    PeriodoVisita["TARDE"] = "TARDE";
})(PeriodoVisita || (exports.PeriodoVisita = PeriodoVisita = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["ABERTA"] = "ABERTA";
    OrderStatus["VISITA_TECNICA"] = "VISITA_TECNICA";
    OrderStatus["EM_ATENDIMENTO"] = "EM_ATENDIMENTO";
    OrderStatus["AGUARDANDO_APROVACAO"] = "AGUARDANDO_APROVACAO";
    OrderStatus["RETORNO_GARANTIA"] = "RETORNO_GARANTIA";
    OrderStatus["FINALIZADA"] = "FINALIZADA";
    OrderStatus["CANCELADA"] = "CANCELADA";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
