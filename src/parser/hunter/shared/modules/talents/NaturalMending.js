import React from 'react';

import SPELLS from 'common/SPELLS/index';
import Analyzer from 'parser/core/Analyzer';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import { formatNumber } from 'common/format';
import SPECS from 'game/SPECS';
import TalentStatisticBox from 'interface/others/TalentStatisticBox';

/**
 * Every 20 (MM/SV) or 30 (BM) focus you spend reducxes the remaining cooldown of Exhilaration by 1 sec.
 *
 * Example log: https://www.warcraftlogs.com/reports/8jJqDcrGK1xM3Wn6#fight=2&type=damage-done
 */

const MM_SV_CDR_PER_FOCUS = 1000 / 20;
const BM_CDR_PER_FOCUS = 1000 / 30;

class NaturalMending extends Analyzer {
  static dependencies = {
    spellUsable: SpellUsable,
  };

  cdrPerFocus = MM_SV_CDR_PER_FOCUS;
  effectiveExhilReductionMs = 0;
  wastedExhilReductionMs = 0;
  lastFocusCost = 0;

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasTalent(SPELLS.NATURAL_MENDING_TALENT.id);
    if (this.active && this.selectedCombatant.spec === SPECS.BEAST_MASTERY_HUNTER) {
      this.cdrPerFocus = BM_CDR_PER_FOCUS;
    }
  }

  on_byPlayer_cast(event) {
    if (!event || !event.classResources || event.classResources[0].cost === 0) {
      return;
    }
    this.lastFocusCost = event.classResources[0].cost || 0;
    const cooldownReductionMS = this.cdrPerFocus * this.lastFocusCost;
    if (!this.spellUsable.isOnCooldown(SPELLS.EXHILARATION.id)) {
      this.wastedExhilReductionMs += cooldownReductionMS;
      return;
    }
    if (this.spellUsable.cooldownRemaining(SPELLS.EXHILARATION.id) < cooldownReductionMS) {
      const effectiveReductionMs = this.spellUsable.reduceCooldown(SPELLS.EXHILARATION.id, cooldownReductionMS);
      this.effectiveExhilReductionMs += effectiveReductionMs;
      this.wastedExhilReductionMs += (cooldownReductionMS - effectiveReductionMs);
      return;
    }
    this.effectiveExhilReductionMs += this.spellUsable.reduceCooldown(SPELLS.EXHILARATION.id, cooldownReductionMS);
  }

  statistic() {
    return (
      <TalentStatisticBox
        talent={SPELLS.NATURAL_MENDING_TALENT.id}
        value={`${formatNumber(this.effectiveExhilReductionMs / 1000)}s/${formatNumber((this.wastedExhilReductionMs + this.effectiveExhilReductionMs) / 1000)}s CDR`}
        tooltip={`You wasted ${formatNumber(this.wastedExhilReductionMs / 1000)} seconds of CDR by spending focus whilst Exhilaration wasn't on cooldown.`} />
    );
  }

}

export default NaturalMending;
