import { chipProps } from "@tscircuit/props"
import type { SchematicPortArrangement } from "circuit-json"
import { NormalComponent } from "lib/components/base-components/NormalComponent"
import { underscorifyPinStyles } from "lib/soup/underscorifyPinStyles"
import { underscorifyPortArrangement } from "lib/soup/underscorifyPortArrangement"
import {
  type SchematicBoxDimensions,
  getAllDimensionsForSchematicBox,
} from "lib/utils/schematic/getAllDimensionsForSchematicBox"
import { Trace } from "lib/components/primitive-components/Trace/Trace"
import { Port } from "lib/components/primitive-components/Port"

export class Chip<PinLabels extends string = never> extends NormalComponent<
  typeof chipProps,
  PinLabels
> {
  schematicBoxDimensions: SchematicBoxDimensions | null = null

  get config() {
    return {
      componentName: "Chip",
      zodProps: chipProps,
      shouldRenderAsSchematicBox: true,
    }
  }

  initPorts(opts = {}): void {
    // First, call the parent initPorts to create ports normally
    super.initPorts(opts)

    // Then, ensure that any pins referenced in externallyConnectedPins have ports created
    const { _parsedProps: props } = this
    if (props.externallyConnectedPins) {
      const requiredPorts = new Set<string>()

      // Collect all pin identifiers that need ports
      for (const [pin1, pin2] of props.externallyConnectedPins) {
        requiredPorts.add(pin1)
        requiredPorts.add(pin2)
      }

      // Create ports for any missing pin identifiers
      for (const pinIdentifier of requiredPorts) {
        // Check if a port already exists that matches this identifier
        const existingPort = this.children.find(
          (child) =>
            child instanceof Port && child.isMatchingAnyOf([pinIdentifier]),
        )

        if (!existingPort) {
          // Try to parse as a numeric pin (e.g., "pin1" -> pinNumber: 1)
          const pinMatch = pinIdentifier.match(/^pin(\d+)$/)
          if (pinMatch) {
            const pinNumber = parseInt(pinMatch[1])
            this.add(
              new Port({
                pinNumber,
                aliases: [pinIdentifier],
              }),
            )
          } else {
            // It's an alias like "VCC", "VDD", etc.
            this.add(
              new Port({
                name: pinIdentifier,
                aliases: [pinIdentifier],
              }),
            )
          }
        }
      }
    }
  }

  doInitialSchematicComponentRender(): void {
    const { _parsedProps: props } = this
    // Early return if noSchematicRepresentation is true
    if (props?.noSchematicRepresentation === true) return

    // Continue with normal schematic rendering
    super.doInitialSchematicComponentRender()
  }

  doInitialSourceRender(): void {
    const { db } = this.root!
    const { _parsedProps: props } = this

    const source_component = db.source_component.insert({
      ftype: "simple_chip",
      name: this.name,
      manufacturer_part_number: props.manufacturerPartNumber,
      supplier_part_numbers: props.supplierPartNumbers,
    })

    this.source_component_id = source_component.source_component_id!
  }

  doInitialPcbComponentRender() {
    if (this.root?.pcbDisabled) return
    const { db } = this.root!
    const { _parsedProps: props } = this

    const pcb_component = db.pcb_component.insert({
      center: { x: props.pcbX ?? 0, y: props.pcbY ?? 0 },
      width: 2, // Default width, adjust as needed
      height: 3, // Default height, adjust as needed
      layer: props.layer ?? "top",
      rotation: props.pcbRotation ?? 0,
      source_component_id: this.source_component_id!,
      subcircuit_id: this.getSubcircuit().subcircuit_id ?? undefined,
    })

    this.pcb_component_id = pcb_component.pcb_component_id
  }

  doInitialCreateTracesFromProps(): void {
    const { _parsedProps: props } = this

    if (props.externallyConnectedPins) {
      for (const [pin1, pin2] of props.externallyConnectedPins) {
        this.add(
          new Trace({
            from: `${this.getSubcircuitSelector()} > port.${pin1}`,
            to: `${this.getSubcircuitSelector()} > port.${pin2}`,
          }),
        )
      }
    }

    this._createTracesFromConnectionsProp()
  }
}
