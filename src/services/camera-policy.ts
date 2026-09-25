/** Interpret camera requests semantically in the existing generation call, not with a keyword whitelist. */
export const CAMERA_INSTRUCTIONS = `CAMERA AND VIEWPOINT POLICY:
Interpret the latest brief.camera.request in natural language before generating the image. This is a rendering request, not permission to override the architectural constraints.
If the user requests a different angle, viewpoint, camera height, viewing direction, distance, lens or framing, render that view of the SAME target room. No camera marker, coordinates, arrow, annotation or predefined viewpoint on the floorplan is required. Do not draw any camera marker or explanatory text.
Understand descriptions such as "vista da entrada olhando para o fundo", "do canto oposto", "angulo lateral", "vista de cima", "camera a 45 graus", "gire a camera 90 graus para a direita", "mostre o outro lado", "aproxime a camera" and equivalent Portuguese or English phrasing. These are examples, not a closed list. Resolve relative directions against the latest source image and room references; use history only to resolve context, never to repeat an earlier camera rotation on a later decorative edit.
Move or rotate the virtual CAMERA, never the room or its objects. Keep the same physical room, architecture, furniture positions, orientations, scale, products, materials, equipment and lighting unless the user separately requests permitted changes. A camera-only request must not restyle the room or regenerate its composition from scratch. A mixed camera-and-style request may change only the requested style aspects within catalog rules.
Perspective, apparent size, visible faces, framing and physically correct occlusion may change. Objects outside the new field of view remain in their original world positions; do not move them into view to make the inventory visible. Never mirror or simply rotate the original bitmap to fake a new angle. Reconstruct only plausible newly visible surfaces consistent with the plan and references; do not invent openings, extra rooms or extra furniture. An elevated or overhead view does not authorize demolition or changing ceiling geometry.
When direction is underspecified, choose a plausible camera position in or looking into the requested room. Interpret degrees as camera viewing direction relative to the current view unless another axis is stated; do not claim survey-level precision from a 2D reference.
If the current request has no camera change, or explicitly says to keep the angle (for example "nao mude o angulo, apenas a cor"), keep the source camera and framing. Without a source use an eye-level interior perspective by default. Mentions of the angle of a furniture item or a material pattern are not camera requests. The floorplan remains an architectural reference, not a restriction to its illustrated viewpoint.`;

export function cameraBrief(request:string,hasSource:boolean){
  return {
    interpretation:'natural_language' as const,
    request,
    defaultView:hasSource?'preserve_source':'eye_level',
    requiresFloorplanMarker:false,
    preserveWorldLayout:true,
  };
}
