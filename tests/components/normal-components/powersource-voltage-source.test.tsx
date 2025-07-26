import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import "lib/register-catalogue"
import type { PowerSource } from "lib/components/normal-components/PowerSource"

test("PowerSource with voltage prop creates a simulation_voltage_source", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <powersource name="pwr1" voltage={5} />
    </board>,
  )

  circuit.render()

  const voltageSources = circuit.db.simulation_voltage_source.list()
  expect(voltageSources).toHaveLength(1)

  const vs = voltageSources[0]
  expect(vs.voltage).toBe(5)

  const pwrSource = circuit.selectOne("powersource") as PowerSource

  expect(vs.positive_source_port_id).toBe(pwrSource.pos.source_port_id ?? "")
  expect(vs.negative_source_port_id).toBe(pwrSource.neg.source_port_id ?? "")
})
