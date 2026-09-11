# 4. Solution strategy

State: **Target**

The reusable unit is a skill package containing execution guidance, a work-map
input contract, rendering/validation tools, and a bundled viewer. The agent
authors the data consumed by those tools. It does not redesign the interface
during each generation.

The dependency direction is source facts to interpreted work-map data to
validated rendering to the browser artifact. The viewer must consume the
work-map contract without depending on Linear credentials or the source query
mechanism.

Archify provides a reference for this separation: typed authoring, reusable
visual implementation, concrete diagnostics, and verified output. Stellar does
not acquire Archify's renderer as a product dependency through that reference.

## First implementation sequence

1. Import the prototype's viewer source and generation inputs deliberately.
2. Move report-specific titles, timestamps, counts, and attachments into data.
3. Define the smallest contract that renders the existing snapshot correctly.
4. Verify reuse with a distinct synthetic example.
5. Add callable skill guidance around the functioning tools and repair path.

Classification continuity and user overrides must be designed alongside the
first refresh behavior, not claimed from deterministic rendering alone.
