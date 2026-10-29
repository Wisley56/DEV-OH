import type { CardModule } from '../../effects/api';
import thyRevisor from './squad/thy_revisor';
import thyFilosofo from './squad/thy_filosofo';
import thyTechlead from './squad/thy_techlead';
import vitor from './squad/vitor';
import danilo from './squad/danilo';
import douglasAtaque from './squad/douglas_ataque';
import douglasDefensivo from './squad/douglas_defensivo';
import douglasProblemas from './squad/douglas_problemas';
import douglasCalma from './squad/douglas_calma';
import wisley from './squad/wisley';
import kelly from './squad/kelly';
import patricia from './squad/patricia';
import gama from './squad/gama';
import paquito from './squad/paquito';
import moises from './squad/moises';
import curiosa from './squad/curiosa';
import juju from './squad/juju';
import diegao from './squad/diegao';
import brunao from './squad/brunao';
import pirulito from './squad/pirulito';
import claudeAlucinando from './generic/claude_alucinando';
import copilot from './generic/copilot';
import stackoverflow from './generic/stackoverflow';
import docker from './generic/docker';
import estagiario from './generic/estagiario';
import po from './generic/po';
import cliente from './generic/cliente';
import sre from './generic/sre';
import gerente from './generic/gerente';
import backendNoturno from './generic/backend_noturno';
import qa from './generic/qa';
import cafe from './tasks/cafe';
import homeOffice from './tasks/home_office';
import reuniao from './tasks/reuniao';
import refatoracao from './tasks/refatoracao';
import leite from './tasks/leite';
import codeReview from './tasks/code_review';
import hotfix from './tasks/hotfix';
import daily from './tasks/daily';
import gatoGordo from './tasks/gato_gordo';
import deploySexta from './tasks/deploy_sexta';
import ferias from './tasks/ferias';
import chamaThy from './tasks/chama_thy';
import jujuSerio from './tasks/juju_serio';
import careca from './tasks/careca_pensante';
import maoMoises from './tasks/mao_moises';
import iaFezCagada from './bugs/ia_fez_cagada';
import impedimento from './bugs/impedimento';
import mudancaEscopo from './bugs/mudanca_escopo';
import minhaMaquina from './bugs/minha_maquina';
import mergeConflict from './bugs/merge_conflict';
import erro404 from './bugs/erro_404';
import prodCaiu from './bugs/prod_caiu';

/** Todos os cards do DEV-OH!, na ordem da coleção. */
export const CARD_MODULES: CardModule[] = [
  thyRevisor,
  thyFilosofo,
  thyTechlead,
  vitor,
  danilo,
  douglasAtaque,
  douglasDefensivo,
  douglasProblemas,
  douglasCalma,
  wisley,
  kelly,
  patricia,
  gama,
  paquito,
  moises,
  curiosa,
  juju,
  diegao,
  brunao,
  pirulito,
  claudeAlucinando,
  copilot,
  stackoverflow,
  docker,
  estagiario,
  po,
  cliente,
  sre,
  gerente,
  backendNoturno,
  qa,
  cafe,
  homeOffice,
  reuniao,
  refatoracao,
  leite,
  codeReview,
  hotfix,
  daily,
  gatoGordo,
  deploySexta,
  ferias,
  chamaThy,
  jujuSerio,
  careca,
  maoMoises,
  iaFezCagada,
  impedimento,
  mudancaEscopo,
  minhaMaquina,
  mergeConflict,
  erro404,
  prodCaiu,
];
